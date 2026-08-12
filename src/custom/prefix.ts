import * as core from "@actions/core";
import { CompressionMethod } from "@actions/cache/lib/internal/constants";
import * as crypto from "crypto";

const versionSalt = "1.0";
const maxReadPrefixes = 4;

export interface S3PrefixOptions {
    compressionMethod?: CompressionMethod;
    enableCrossOsArchive: boolean;
}

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

    // Add salt to support breaking changes in cache entry
    components.push(versionSalt);

    return crypto
        .createHash("sha256")
        .update(components.join("|"))
        .digest("hex");
}

export function getWriteS3Prefix(
    paths: string[],
    options: S3PrefixOptions
): string | undefined {
    const writePrefix = normalizeS3Prefix(
        process.env.RUNS_ON_S3_CACHE_WRITE_PREFIX
    );
    if (!writePrefix) {
        return undefined;
    }
    return getS3Prefix(writePrefix, paths, options);
}

export function getReadS3Prefixes(
    paths: string[],
    options: S3PrefixOptions
): string[] {
    return getReadRepositoryPrefixes().map(prefix =>
        getS3Prefix(prefix, paths, options)
    );
}

function getReadRepositoryPrefixes(): string[] {
    const raw = process.env.RUNS_ON_S3_CACHE_READ_PREFIXES;
    if (!raw || raw.trim() === "") {
        return [];
    }

    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            core.warning(
                "RUNS_ON_S3_CACHE_READ_PREFIXES must be a JSON array; cache restore is disabled."
            );
            return [];
        }
        const prefixes = uniqueNormalizedPrefixes(
            parsed.filter((value): value is string => typeof value === "string")
        );
        if (prefixes.length === 0) {
            core.warning(
                "RUNS_ON_S3_CACHE_READ_PREFIXES contains no usable prefixes; cache restore is disabled."
            );
        }
        if (prefixes.length > maxReadPrefixes) {
            core.warning(
                `RUNS_ON_S3_CACHE_READ_PREFIXES has more than ${maxReadPrefixes} prefixes; using the first ${maxReadPrefixes}.`
            );
            return prefixes.slice(0, maxReadPrefixes);
        }
        return prefixes;
    } catch {
        core.warning(
            "RUNS_ON_S3_CACHE_READ_PREFIXES is invalid JSON; cache restore is disabled."
        );
        return [];
    }
}

function getS3Prefix(
    repositoryPrefix: string,
    paths: string[],
    { compressionMethod, enableCrossOsArchive }: S3PrefixOptions
): string {
    return [
        repositoryPrefix,
        getCacheVersion(paths, compressionMethod, enableCrossOsArchive)
    ].join("/");
}

function uniqueNormalizedPrefixes(values: string[]): string[] {
    const prefixes: string[] = [];
    const seen = new Set<string>();
    for (const value of values) {
        const prefix = normalizeS3Prefix(value);
        if (prefix && !seen.has(prefix)) {
            seen.add(prefix);
            prefixes.push(prefix);
        }
    }
    return prefixes;
}

export function normalizeS3Prefix(prefix: string | undefined): string {
    return (prefix || "").trim().replace(/^\/+|\/+$/g, "");
}
