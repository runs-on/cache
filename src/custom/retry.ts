import * as core from "@actions/core";
import { getRetryConfig } from "./retryConfig";

export class TimeoutError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TimeoutError";
        Object.setPrototypeOf(this, TimeoutError.prototype);
    }
}

export interface RetryOptions {
    /** Max attempts (including first try). Overrides config if set. */
    maxAttempts?: number;
    /** Predicate to decide if error is retryable. Defaults to always true. */
    isRetryable?: (error: Error) => boolean;
    /** Label for log messages */
    label?: string;
}

/**
 * Generic retry with configurable exponential backoff.
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const config = getRetryConfig();
    const maxAttempts = options.maxAttempts ?? config.maxAttempts;
    const isRetryable = options.isRetryable ?? (() => true);
    const label = options.label ?? "operation";

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            if (attempt >= maxAttempts || !isRetryable(lastError)) {
                throw lastError;
            }

            const delayMs = Math.min(
                config.backoffBaseMs *
                    Math.pow(config.backoffMultiplier, attempt - 1),
                config.backoffMaxMs
            );

            core.warning(
                `${label} attempt ${attempt}/${maxAttempts} failed: ${lastError.message}. Retrying in ${delayMs}ms...`
            );
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    throw lastError || new Error(`${label} failed after all retry attempts`);
}

/**
 * Wraps a promise with a timeout. Rejects with TimeoutError if not resolved in time.
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    label = "operation"
): Promise<T> {
    if (timeoutMs <= 0) return promise;

    let timeoutHandle: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(
            () => reject(new TimeoutError(`${label} timed out after ${timeoutMs}ms`)),
            timeoutMs
        );
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        clearTimeout(timeoutHandle!);
    }
}

/**
 * Wraps an entire operation (restore/save) with the global timeout from config.
 * Disabled when globalTimeoutSeconds is 0.
 */
export async function withGlobalTimeout<T>(
    fn: () => Promise<T>,
    label = "operation"
): Promise<T> {
    const config = getRetryConfig();
    const timeoutSeconds = config.globalTimeoutSeconds;

    if (timeoutSeconds <= 0) {
        return fn();
    }

    return withTimeout(fn(), timeoutSeconds * 1000, label);
}

/**
 * Detects transient AWS/network errors worth retrying.
 */
export function isTransientError(error: Error): boolean {
    const message = error.message || "";
    const name = error.name || "";

    // Our own TimeoutError (from withTimeout) is always transient
    if (name === "TimeoutError") {
        return true;
    }

    // AWS SDK transient errors
    if (
        name === "ThrottlingException" ||
        name === "TooManyRequestsException" ||
        name === "ServiceUnavailable" ||
        name === "InternalError" ||
        name === "RequestTimeout" ||
        name === "SlowDown"
    ) {
        return true;
    }

    // Network-level errors
    if (
        message.includes("ECONNRESET") ||
        message.includes("ETIMEDOUT") ||
        message.includes("ECONNREFUSED") ||
        message.includes("EPIPE") ||
        message.includes("socket hang up") ||
        message.includes("network") ||
        message.includes("NetworkingError")
    ) {
        return true;
    }

    // HTTP 5xx from message
    if (/5\d{2}/.test(message)) {
        return true;
    }

    // Download validation failures (retryable)
    if (
        message.includes("Download validation failed") ||
        message.includes("Range request not supported") ||
        message.includes("Content-Range header") ||
        message.includes("Segment download error") ||
        message.includes("Segment size mismatch")
    ) {
        return true;
    }

    return false;
}
