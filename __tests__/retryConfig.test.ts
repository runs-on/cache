import * as core from "@actions/core";
import { getRetryConfig, resetRetryConfig } from "../src/custom/retryConfig";

jest.mock("@actions/core");

describe("retryConfig", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        resetRetryConfig();
        process.env = { ...originalEnv };
        (core.getInput as jest.Mock).mockReturnValue("");
    });

    afterEach(() => {
        process.env = originalEnv;
        resetRetryConfig();
    });

    it("returns hardcoded defaults when no env vars or inputs set", () => {
        const config = getRetryConfig();

        expect(config.maxAttempts).toBe(3);
        expect(config.backoffBaseMs).toBe(1000);
        expect(config.backoffMultiplier).toBe(2);
        expect(config.backoffMaxMs).toBe(30000);
        expect(config.segmentRetries).toBe(5);
        expect(config.segmentTimeoutMs).toBe(30000);
        expect(config.globalTimeoutSeconds).toBe(300);
        expect(config.s3MaxAttempts).toBe(3);
    });

    it("reads from action inputs when set", () => {
        (core.getInput as jest.Mock).mockImplementation((name: string) => {
            switch (name) {
                case "retry-max-attempts":
                    return "5";
                case "timeout-seconds":
                    return "120";
                case "s3-max-attempts":
                    return "7";
                default:
                    return "";
            }
        });

        const config = getRetryConfig();

        expect(config.maxAttempts).toBe(5);
        expect(config.globalTimeoutSeconds).toBe(120);
        expect(config.s3MaxAttempts).toBe(7);
    });

    it("env var overrides action input", () => {
        (core.getInput as jest.Mock).mockImplementation((name: string) => {
            switch (name) {
                case "retry-max-attempts":
                    return "5";
                case "timeout-seconds":
                    return "120";
                case "s3-max-attempts":
                    return "7";
                default:
                    return "";
            }
        });

        process.env.RETRY_MAX_ATTEMPTS = "10";
        process.env.GLOBAL_TIMEOUT_SECONDS = "60";
        process.env.S3_MAX_ATTEMPTS = "2";

        const config = getRetryConfig();

        expect(config.maxAttempts).toBe(10);
        expect(config.globalTimeoutSeconds).toBe(60);
        expect(config.s3MaxAttempts).toBe(2);
    });

    it("env vars for backoff settings override defaults", () => {
        process.env.RETRY_BACKOFF_BASE_MS = "500";
        process.env.RETRY_BACKOFF_MULTIPLIER = "3";
        process.env.RETRY_BACKOFF_MAX_MS = "60000";
        process.env.SEGMENT_RETRIES = "10";
        process.env.SEGMENT_TIMEOUT_MS = "15000";

        const config = getRetryConfig();

        expect(config.backoffBaseMs).toBe(500);
        expect(config.backoffMultiplier).toBe(3);
        expect(config.backoffMaxMs).toBe(60000);
        expect(config.segmentRetries).toBe(10);
        expect(config.segmentTimeoutMs).toBe(15000);
    });

    it("invalid env var values fall back to defaults", () => {
        process.env.RETRY_MAX_ATTEMPTS = "not-a-number";
        process.env.RETRY_BACKOFF_BASE_MS = "-5";

        const config = getRetryConfig();

        expect(config.maxAttempts).toBe(3);
        expect(config.backoffBaseMs).toBe(1000);
    });

    it("memoizes config on repeated calls", () => {
        const config1 = getRetryConfig();
        process.env.RETRY_MAX_ATTEMPTS = "99";
        const config2 = getRetryConfig();

        expect(config1).toBe(config2);
        expect(config2.maxAttempts).toBe(3); // still the old value
    });

    it("resetRetryConfig clears memoized cache", () => {
        const config1 = getRetryConfig();
        expect(config1.maxAttempts).toBe(3);

        resetRetryConfig();
        process.env.RETRY_MAX_ATTEMPTS = "7";
        const config2 = getRetryConfig();

        expect(config2.maxAttempts).toBe(7);
    });

    it("config object is frozen", () => {
        const config = getRetryConfig();

        expect(() => {
            (config as any).maxAttempts = 999;
        }).toThrow();
    });

    it("allows 0 for global timeout (disabled)", () => {
        process.env.GLOBAL_TIMEOUT_SECONDS = "0";

        const config = getRetryConfig();

        expect(config.globalTimeoutSeconds).toBe(0);
    });
});
