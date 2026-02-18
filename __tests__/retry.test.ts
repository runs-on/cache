import * as core from "@actions/core";
import {
    withRetry,
    withTimeout,
    withGlobalTimeout,
    isTransientError,
    TimeoutError
} from "../src/custom/retry";
import { resetRetryConfig } from "../src/custom/retryConfig";

jest.mock("@actions/core");

describe("retry", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        resetRetryConfig();
        process.env = { ...originalEnv };
        (core.getInput as jest.Mock).mockReturnValue("");
        // Use fast backoff for tests
        process.env.RETRY_BACKOFF_BASE_MS = "1";
        process.env.RETRY_BACKOFF_MAX_MS = "10";
    });

    afterEach(() => {
        process.env = originalEnv;
        resetRetryConfig();
    });

    describe("withRetry", () => {
        it("succeeds on first try", async () => {
            const fn = jest.fn().mockResolvedValue("ok");

            const result = await withRetry(fn, { label: "test" });

            expect(result).toBe("ok");
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it("retries on failure and then succeeds", async () => {
            const fn = jest
                .fn()
                .mockRejectedValueOnce(new Error("fail1"))
                .mockRejectedValueOnce(new Error("fail2"))
                .mockResolvedValue("ok");

            const result = await withRetry(fn, { label: "test" });

            expect(result).toBe("ok");
            expect(fn).toHaveBeenCalledTimes(3);
        });

        it("throws after max attempts exhausted", async () => {
            const fn = jest.fn().mockRejectedValue(new Error("always fails"));

            await expect(
                withRetry(fn, { maxAttempts: 3, label: "test" })
            ).rejects.toThrow("always fails");

            expect(fn).toHaveBeenCalledTimes(3);
        });

        it("respects isRetryable predicate - non-retryable throws immediately", async () => {
            const fn = jest.fn().mockRejectedValue(new Error("not retryable"));

            await expect(
                withRetry(fn, {
                    maxAttempts: 3,
                    isRetryable: () => false,
                    label: "test"
                })
            ).rejects.toThrow("not retryable");

            expect(fn).toHaveBeenCalledTimes(1);
        });

        it("respects isRetryable predicate - retryable retries", async () => {
            const fn = jest
                .fn()
                .mockRejectedValueOnce(new Error("retryable"))
                .mockResolvedValue("ok");

            const result = await withRetry(fn, {
                maxAttempts: 3,
                isRetryable: (e: Error) => e.message === "retryable",
                label: "test"
            });

            expect(result).toBe("ok");
            expect(fn).toHaveBeenCalledTimes(2);
        });

        it("uses maxAttempts from config by default", async () => {
            process.env.RETRY_MAX_ATTEMPTS = "2";
            resetRetryConfig();

            const fn = jest.fn().mockRejectedValue(new Error("fail"));

            await expect(withRetry(fn, { label: "test" })).rejects.toThrow(
                "fail"
            );

            expect(fn).toHaveBeenCalledTimes(2);
        });

        it("logs warnings on retry", async () => {
            const fn = jest
                .fn()
                .mockRejectedValueOnce(new Error("transient"))
                .mockResolvedValue("ok");

            await withRetry(fn, { label: "myOp" });

            expect(core.warning).toHaveBeenCalledWith(
                expect.stringContaining("myOp attempt 1/3 failed: transient")
            );
        });
    });

    describe("withTimeout", () => {
        it("resolves before timeout", async () => {
            const result = await withTimeout(
                Promise.resolve("ok"),
                1000,
                "test"
            );

            expect(result).toBe("ok");
        });

        it("rejects on timeout", async () => {
            const neverResolves = new Promise(() => {});

            await expect(
                withTimeout(neverResolves, 10, "test")
            ).rejects.toThrow(TimeoutError);
        });

        it("includes label in timeout error message", async () => {
            const neverResolves = new Promise(() => {});

            await expect(
                withTimeout(neverResolves, 10, "myOp")
            ).rejects.toThrow("myOp timed out after 10ms");
        });

        it("passes through when timeoutMs <= 0", async () => {
            const result = await withTimeout(
                Promise.resolve("ok"),
                0,
                "test"
            );

            expect(result).toBe("ok");
        });
    });

    describe("withGlobalTimeout", () => {
        it("applies timeout from config", async () => {
            process.env.GLOBAL_TIMEOUT_SECONDS = "1";
            resetRetryConfig();

            const fn = jest.fn(
                () => new Promise(resolve => setTimeout(resolve, 5000))
            );

            await expect(withGlobalTimeout(fn, "test")).rejects.toThrow(
                TimeoutError
            );
        });

        it("disabled when globalTimeoutSeconds is 0", async () => {
            process.env.GLOBAL_TIMEOUT_SECONDS = "0";
            resetRetryConfig();

            const fn = jest.fn().mockResolvedValue("ok");

            const result = await withGlobalTimeout(fn, "test");

            expect(result).toBe("ok");
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it("succeeds within timeout", async () => {
            process.env.GLOBAL_TIMEOUT_SECONDS = "10";
            resetRetryConfig();

            const fn = jest.fn().mockResolvedValue("done");

            const result = await withGlobalTimeout(fn, "test");

            expect(result).toBe("done");
        });
    });

    describe("isTransientError", () => {
        it("detects AWS throttling errors", () => {
            const err = new Error("Request limit exceeded");
            err.name = "ThrottlingException";
            expect(isTransientError(err)).toBe(true);
        });

        it("detects ServiceUnavailable", () => {
            const err = new Error("Service unavailable");
            err.name = "ServiceUnavailable";
            expect(isTransientError(err)).toBe(true);
        });

        it("detects network errors by message", () => {
            expect(isTransientError(new Error("ECONNRESET"))).toBe(true);
            expect(isTransientError(new Error("ETIMEDOUT"))).toBe(true);
            expect(isTransientError(new Error("socket hang up"))).toBe(true);
            expect(isTransientError(new Error("ECONNREFUSED"))).toBe(true);
        });

        it("detects download validation failures", () => {
            expect(
                isTransientError(
                    new Error("Download validation failed: size mismatch")
                )
            ).toBe(true);
            expect(
                isTransientError(
                    new Error("Range request not supported by server")
                )
            ).toBe(true);
        });

        it("detects HTTP 5xx errors", () => {
            expect(isTransientError(new Error("HTTP 503"))).toBe(true);
            expect(isTransientError(new Error("Status 500"))).toBe(true);
        });

        it("returns false for non-transient errors", () => {
            expect(isTransientError(new Error("Access Denied"))).toBe(false);
            expect(isTransientError(new Error("NoSuchBucket"))).toBe(false);
            expect(isTransientError(new Error("Invalid key"))).toBe(false);
        });
    });
});
