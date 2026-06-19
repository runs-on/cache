import { CompressionMethod } from "@actions/cache/lib/internal/constants";
import * as crypto from "crypto";

const versionSalt = "1.0";

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

export function getS3Prefix(
    paths: string[],
    { compressionMethod, enableCrossOsArchive }
): string {
    const repository = process.env.GITHUB_REPOSITORY;
    const repoPrefix = process.env.RUNS_ON_S3_CACHE_REPO_PREFIX;
    const version = getCacheVersion(
        paths,
        compressionMethod,
        enableCrossOsArchive
    );

    if (repoPrefix && repoPrefix.trim() !== "") {
        return [normalizeS3Prefix(repoPrefix), version].join("/");
    }

    return ["cache", repository, version].join("/");
}

function normalizeS3Prefix(prefix: string): string {
    return prefix.trim().replace(/^\/+|\/+$/g, "");
}
