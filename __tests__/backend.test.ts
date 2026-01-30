// Tests for src/custom/backend.ts
// These tests validate the S3 path prefix behavior with RUNS_ON_S3_PATH_PREFIX

describe("backend getS3Prefix with default prefix", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        // Set required env vars
        process.env.GITHUB_REPOSITORY = "owner/repo";
        process.env.AWS_REGION = "us-east-1";
        // Ensure RUNS_ON_S3_PATH_PREFIX is not set (default behavior)
        delete process.env.RUNS_ON_S3_PATH_PREFIX;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it("should use default prefix cache/<repo> when RUNS_ON_S3_PATH_PREFIX is undefined", async () => {
        const { getS3Prefix, getCacheVersion } = await import(
            "../src/custom/backend"
        );

        const paths = ["node_modules"];
        const options = {
            compressionMethod: undefined,
            enableCrossOsArchive: false
        };

        const prefix = getS3Prefix(paths, options);
        const version = getCacheVersion(paths, undefined, false);

        expect(prefix).toBe(`cache/owner/repo/${version}`);
    });
});

describe("backend getS3Prefix with custom prefix", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        process.env.GITHUB_REPOSITORY = "owner/repo";
        process.env.AWS_REGION = "us-east-1";
        process.env.RUNS_ON_S3_PATH_PREFIX = "shared-cache";
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it("should use custom prefix when RUNS_ON_S3_PATH_PREFIX is set", async () => {
        const { getS3Prefix, getCacheVersion } = await import(
            "../src/custom/backend"
        );

        const paths = ["node_modules"];
        const options = {
            compressionMethod: undefined,
            enableCrossOsArchive: false
        };

        const prefix = getS3Prefix(paths, options);
        const version = getCacheVersion(paths, undefined, false);

        expect(prefix).toBe(`shared-cache/${version}`);
    });
});

describe("backend getS3Prefix with empty prefix", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        process.env.GITHUB_REPOSITORY = "owner/repo";
        process.env.AWS_REGION = "us-east-1";
        process.env.RUNS_ON_S3_PATH_PREFIX = "";
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it("should use only version hash when RUNS_ON_S3_PATH_PREFIX is empty string", async () => {
        const { getS3Prefix, getCacheVersion } = await import(
            "../src/custom/backend"
        );

        const paths = ["node_modules"];
        const options = {
            compressionMethod: undefined,
            enableCrossOsArchive: false
        };

        const prefix = getS3Prefix(paths, options);
        const version = getCacheVersion(paths, undefined, false);

        // With empty prefix, result should be just the version hash
        expect(prefix).toBe(version);
        expect(prefix).not.toContain("/");
    });
});

describe("backend getCacheVersion", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        process.env.AWS_REGION = "us-east-1";
        delete process.env.RUNS_ON_S3_PATH_PREFIX;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it("should generate consistent version hash for same paths", async () => {
        const { getCacheVersion } = await import("../src/custom/backend");

        const paths = ["node_modules", ".npm"];
        const version1 = getCacheVersion(paths, undefined, false);
        const version2 = getCacheVersion(paths, undefined, false);

        expect(version1).toBe(version2);
        expect(version1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it("should generate different version hash for different paths", async () => {
        const { getCacheVersion } = await import("../src/custom/backend");

        const version1 = getCacheVersion(["node_modules"], undefined, false);
        const version2 = getCacheVersion([".npm"], undefined, false);

        expect(version1).not.toBe(version2);
    });
});
