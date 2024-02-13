import {
    S3Client,
    GetObjectCommand,
    ListObjectsV2Command
} from "@aws-sdk/client-s3";
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
import { createReadStream } from "fs";
import * as crypto from "crypto";
import {
    DownloadOptions,
    getDownloadOptions
} from "@actions/cache/lib/options";
import { CompressionMethod } from "@actions/cache/lib/internal/constants";
import * as core from "@actions/core";
import * as utils from "@actions/cache/lib/internal/cacheUtils";
import { Upload } from "@aws-sdk/lib-storage";
import { downloadCacheHttpClientConcurrent } from "./downloadUtils";

export interface ArtifactCacheEntry {
    cacheKey?: string;
    scope?: string;
    cacheVersion?: string;
    creationTime?: string;
    archiveLocation?: string;
}

const versionSalt = "1.0";
const bucketName = process.env.RUNS_ON_S3_BUCKET_CACHE;
const region =
    process.env.RUNS_ON_AWS_REGION ||
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION;

export function getCacheVersion(
    paths: string[],
    compressionMethod?: CompressionMethod,
    enableCrossOsArchive = false
): string {
    // don't pass changes upstream
    const components = paths.slice();

    // Add compression method to cache version to restore
    // compressed cache as per compression method
    if (compressionMethod) {
        components.push(compressionMethod);
    }

    // Only check for windows platforms if enableCrossOsArchive is false
    if (process.platform === "win32" && !enableCrossOsArchive) {
        components.push("windows-only");
    }

    // Add salt to cache version to support breaking changes in cache entry
    components.push(versionSalt);

    return crypto
        .createHash("sha256")
        .update(components.join("|"))
        .digest("hex");
}

function getS3Prefix(
    paths: string[],
    { compressionMethod, enableCrossOsArchive }
): string {
    const repository = process.env.GITHUB_REPOSITORY;
    const version = getCacheVersion(
        paths,
        compressionMethod,
        enableCrossOsArchive
    );

    return ["cache", repository, version].join("/");
}

export async function getCacheEntry(
    keys,
    paths,
    { compressionMethod, enableCrossOsArchive }
) {
    const cacheEntry: ArtifactCacheEntry = {};
    const s3Client = new S3Client({ region });

    // Find the most recent key matching one of the restoreKeys prefixes
    for (const restoreKey of keys) {
        const s3Prefix = getS3Prefix(paths, {
            compressionMethod,
            enableCrossOsArchive
        });
        const listObjectsParams = {
            Bucket: bucketName,
            Prefix: [s3Prefix, restoreKey].join("/")
        };

        try {
            const { Contents = [] } = await s3Client.send(
                new ListObjectsV2Command(listObjectsParams)
            );
            if (Contents.length > 0) {
                // Sort keys by LastModified time in descending order
                const sortedKeys = Contents.sort(
                    (a, b) => Number(b.LastModified) - Number(a.LastModified)
                );
                const s3Path = sortedKeys[0].Key; // Return the most recent key
                cacheEntry.cacheKey = s3Path?.replace(`${s3Prefix}/`, "");
                cacheEntry.archiveLocation = `s3://${bucketName}/${s3Path}`;
                return cacheEntry;
            }
        } catch (error) {
            console.error(
                `Error listing objects with prefix ${restoreKey} in bucket ${bucketName}:`,
                error
            );
        }
    }

    return cacheEntry; // No keys found
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

    const s3Client = new S3Client({ region });
    const archiveUrl = new URL(archiveLocation);
    const objectKey = archiveUrl.pathname.slice(1);
    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey
    });
    const url = await getSignedUrl(s3Client, command, {
        expiresIn: 3600
    });
    const downloadOptions = getDownloadOptions({
        ...options,
        downloadConcurrency: 14,
        concurrentBlobDownloads: true
    });
    await downloadCacheHttpClientConcurrent(url, archivePath, downloadOptions);
}

export async function saveCache(
    key: string,
    paths: string[],
    archivePath: string,
    { compressionMethod, enableCrossOsArchive, cacheSize: archiveFileSize }
): Promise<void> {
    if (!bucketName) {
        throw new Error("Environment variable RUNS_ON_S3_BUCKET_CACHE not set");
    }

    if (!region) {
        throw new Error("Environment variable RUNS_ON_AWS_REGION not set");
    }

    const s3Client = new S3Client({ region });
    const s3Prefix = getS3Prefix(paths, {
        compressionMethod,
        enableCrossOsArchive
    });
    const s3Key = `${s3Prefix}/${key}`;

    const multipartUpload = new Upload({
        client: s3Client,
        params: {
            Bucket: bucketName,
            Key: s3Key,
            Body: createReadStream(archivePath)
        },

        // Part size in bytes
        partSize: 32 * 1024 * 1024,

        // Max concurrency
        queueSize: 14
    });

    // Commit Cache
    const cacheSize = utils.getArchiveFileSizeInBytes(archivePath);
    core.info(
        `Cache Size: ~${Math.round(
            cacheSize / (1024 * 1024)
        )} MB (${cacheSize} B)`
    );

    core.info(`Uploading cache from ${archivePath} to ${bucketName}/${s3Key}`);
    multipartUpload.on("httpUploadProgress", progress => {
        core.info(`Uploaded ${progress.part}/${progress.total}.`);
    });

    await multipartUpload.done();
    core.info(`Cache saved successfully.`);
}
