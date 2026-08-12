import * as utils from "@actions/cache/lib/internal/cacheUtils";
import { DownloadOptions } from "@actions/cache/lib/options";
import * as core from "@actions/core";
import {
    GetObjectCommand,
    ListObjectsV2Command,
    S3Client
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createReadStream } from "fs";

import { downloadCacheHttpClientConcurrent } from "./downloadUtils";
import { getReadS3Prefixes, getWriteS3Prefix } from "./prefix";

const maxListPages = 10;

type S3Object = {
    Key?: string;
    LastModified?: Date;
};

export interface ArtifactCacheEntry {
    cacheKey?: string;
    scope?: string;
    cacheVersion?: string;
    creationTime?: string;
    archiveLocation?: string;
}

const bucketName = process.env.RUNS_ON_S3_BUCKET_CACHE;
const endpoint = process.env.RUNS_ON_S3_BUCKET_ENDPOINT;
const region =
    process.env.RUNS_ON_AWS_REGION ||
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION;
const forcePathStyle =
    process.env.RUNS_ON_S3_FORCE_PATH_STYLE === "true" ||
    process.env.AWS_S3_FORCE_PATH_STYLE === "true";

const uploadQueueSize = Number(process.env.UPLOAD_QUEUE_SIZE || "4");
const uploadPartSize =
    Number(process.env.UPLOAD_PART_SIZE || "32") * 1024 * 1024;
const downloadQueueSize = Number(process.env.DOWNLOAD_QUEUE_SIZE || "8");
const downloadPartSize =
    Number(process.env.DOWNLOAD_PART_SIZE || "16") * 1024 * 1024;

export const s3Client = new S3Client({ region, forcePathStyle, endpoint });

export async function getCacheEntry(
    keys,
    paths,
    { compressionMethod, enableCrossOsArchive }
) {
    const readPrefixes = getReadS3Prefixes(paths, {
        compressionMethod,
        enableCrossOsArchive
    });

    for (const s3Prefix of readPrefixes) {
        for (const restoreKey of keys) {
            try {
                const object = await findCacheObject(s3Prefix, restoreKey);
                if (!object?.Key) {
                    continue;
                }
                return {
                    cacheKey: object.Key.replace(`${s3Prefix}/`, ""),
                    archiveLocation: `s3://${bucketName}/${object.Key}`
                };
            } catch (error) {
                core.warning(
                    `Failed to search an S3 cache scope: ${(error as Error).message}`
                );
            }
        }
    }

    return {} as ArtifactCacheEntry;
}

export async function findCacheObject(
    s3Prefix: string,
    restoreKey: string
): Promise<S3Object | undefined> {
    const prefix = `${s3Prefix}/${restoreKey}`;
    const objects: S3Object[] = [];
    let continuationToken: string | undefined;

    for (let page = 0; page < maxListPages; page++) {
        const response = await s3Client.send(
            new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: prefix,
                ContinuationToken: continuationToken
            })
        );
        objects.push(...(response.Contents || []));
        if (!response.IsTruncated || !response.NextContinuationToken) {
            break;
        }
        continuationToken = response.NextContinuationToken;
        if (page === maxListPages - 1) {
            core.warning(
                `S3 cache search reached the ${maxListPages}-page limit for a key prefix; selecting the best result scanned.`
            );
        }
    }

    return selectCacheObject(objects, `${s3Prefix}/${restoreKey}`);
}

export function selectCacheObject(
    objects: S3Object[],
    exactKey: string
): S3Object | undefined {
    const exact = objects.find(object => object.Key === exactKey);
    if (exact) {
        return exact;
    }
    return objects.reduce<S3Object | undefined>((newest, object) => {
        if (
            !newest ||
            (object.LastModified?.getTime() || 0) >
                (newest.LastModified?.getTime() || 0)
        ) {
            return object;
        }
        return newest;
    }, undefined);
}

export async function downloadCache(
    archiveLocation: string,
    archivePath: string,
    options?: DownloadOptions
): Promise<void> {
    if (!bucketName) {
        throw new Error("Environment variable RUNS_ON_S3_BUCKET_CACHE not set");
    }

    if (!region) {
        throw new Error("Environment variable RUNS_ON_AWS_REGION not set");
    }

    const archiveUrl = new URL(archiveLocation);
    const objectKey = archiveUrl.pathname.slice(1);

    // Retry logic for download validation failures
    const maxRetries = 3;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const command = new GetObjectCommand({
                Bucket: bucketName,
                Key: objectKey
            });
            const url = await getSignedUrl(s3Client, command, {
                expiresIn: 3600
            });

            await downloadCacheHttpClientConcurrent(url, archivePath, {
                ...options,
                downloadConcurrency: downloadQueueSize,
                concurrentBlobDownloads: true,
                partSize: downloadPartSize
            });

            // If we get here, download succeeded
            return;
        } catch (error) {
            const errorMessage = (error as Error).message;
            lastError = error as Error;

            // Only retry on validation failures, not on other errors
            if (
                errorMessage.includes("Download validation failed") ||
                errorMessage.includes("Range request not supported") ||
                errorMessage.includes("Content-Range header")
            ) {
                if (attempt < maxRetries) {
                    const delayMs = Math.pow(2, attempt - 1) * 1000; // exponential backoff
                    core.warning(
                        `Download attempt ${attempt} failed: ${errorMessage}. Retrying in ${delayMs}ms...`
                    );
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    continue;
                }
            }

            // For non-retryable errors or max retries reached, throw the error
            throw error;
        }
    }

    // This should never be reached, but just in case
    throw lastError || new Error("Download failed after all retry attempts");
}

export async function saveCache(
    key: string,
    paths: string[],
    archivePath: string,
    options
): Promise<boolean> {
    const { compressionMethod, enableCrossOsArchive } = options;

    if (!bucketName) {
        throw new Error("Environment variable RUNS_ON_S3_BUCKET_CACHE not set");
    }

    if (!region) {
        throw new Error("Environment variable RUNS_ON_AWS_REGION not set");
    }

    const s3Prefix = getWriteS3Prefix(paths, {
        compressionMethod,
        enableCrossOsArchive
    });
    if (!s3Prefix) {
        core.info(
            "Cache save skipped because this workflow has no writable S3 cache scope."
        );
        return false;
    }
    const s3Key = `${s3Prefix}/${key}`;

    const multipartUpload = new Upload({
        client: s3Client,
        params: {
            Bucket: bucketName,
            Key: s3Key,
            Body: createReadStream(archivePath)
        },
        // Part size in bytes
        partSize: uploadPartSize,
        // Max concurrency
        queueSize: uploadQueueSize
    });

    // Commit Cache
    const cacheSize = utils.getArchiveFileSizeInBytes(archivePath);
    core.info(
        `Cache Size: ~${Math.round(
            cacheSize / (1024 * 1024)
        )} MB (${cacheSize} B)`
    );

    const totalParts = Math.ceil(cacheSize / uploadPartSize);
    core.info(`Uploading cache from ${archivePath} to ${bucketName}/${s3Key}`);
    multipartUpload.on("httpUploadProgress", progress => {
        core.info(`Uploaded part ${progress.part}/${totalParts}.`);
    });

    await multipartUpload.done();
    core.info(`Cache saved successfully.`);
    return true;
}
