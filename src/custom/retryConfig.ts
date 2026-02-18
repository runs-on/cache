import * as core from "@actions/core";
import { Inputs } from "../constants";

export interface RetryConfig {
    /** Max retry attempts for S3 operations. 1 = no retry. */
    maxAttempts: number;
    /** Base delay in ms for exponential backoff */
    backoffBaseMs: number;
    /** Backoff multiplier */
    backoffMultiplier: number;
    /** Maximum backoff delay cap in ms */
    backoffMaxMs: number;
    /** Per-segment download retry count */
    segmentRetries: number;
    /** Per-segment download timeout in ms */
    segmentTimeoutMs: number;
    /** Global timeout for entire restore/save operation in seconds. 0 = disabled. */
    globalTimeoutSeconds: number;
    /** AWS SDK S3Client internal retry count */
    s3MaxAttempts: number;
}

let cached: Readonly<RetryConfig> | undefined;

function readInt(
    envVar: string,
    inputName: string | undefined,
    defaultValue: number
): number {
    const envVal = process.env[envVar];
    if (envVal !== undefined && envVal !== "") {
        const parsed = parseInt(envVal, 10);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
    }

    if (inputName) {
        const inputVal = core.getInput(inputName);
        if (inputVal !== "") {
            const parsed = parseInt(inputVal, 10);
            if (!isNaN(parsed) && parsed >= 0) return parsed;
        }
    }

    return defaultValue;
}

export function getRetryConfig(): Readonly<RetryConfig> {
    if (cached) return cached;

    const config: RetryConfig = {
        maxAttempts: readInt("RETRY_MAX_ATTEMPTS", Inputs.RetryMaxAttempts, 3),
        backoffBaseMs: readInt("RETRY_BACKOFF_BASE_MS", undefined, 1000),
        backoffMultiplier: readInt("RETRY_BACKOFF_MULTIPLIER", undefined, 2),
        backoffMaxMs: readInt("RETRY_BACKOFF_MAX_MS", undefined, 30000),
        segmentRetries: readInt("SEGMENT_RETRIES", undefined, 5),
        segmentTimeoutMs: readInt("SEGMENT_TIMEOUT_MS", undefined, 30000),
        globalTimeoutSeconds: readInt(
            "GLOBAL_TIMEOUT_SECONDS",
            Inputs.TimeoutSeconds,
            300
        ),
        s3MaxAttempts: readInt("S3_MAX_ATTEMPTS", Inputs.S3MaxAttempts, 3)
    };

    cached = Object.freeze(config);
    return cached;
}

/** Reset memoized config (for testing) */
export function resetRetryConfig(): void {
    cached = undefined;
}
