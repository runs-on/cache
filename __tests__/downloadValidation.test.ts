import * as core from "@actions/core";
import * as crypto from "crypto";
import * as fs from "fs";
import { Readable } from "stream";
import nock from "nock";
import * as path from "path";

import { DownloadValidationError, restoreCache } from "../src/custom/cache";
import {
    downloadCacheHttpClientConcurrent,
    computeFileSha256
} from "../src/custom/downloadUtils";

// Mock the core module
jest.mock("@actions/core");

// Mock fs for file size checks and SHA-256 stream reads
jest.mock("fs", () => {
    const actual = jest.requireActual("fs");
    return {
        ...actual,
        createReadStream: jest.fn(actual.createReadStream),
        promises: {
            ...actual.promises,
            open: jest.fn()
        }
    };
});

describe("Download Validation", () => {
    const testArchivePath = "/tmp/test-cache.tar.gz";
    const testUrl = "https://example.com/cache.tar.gz";

    beforeEach(() => {
        jest.clearAllMocks();
        nock.cleanAll();
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe("downloadCacheHttpClientConcurrent", () => {
        it("should validate segment size matches expected content-length", async () => {
            const expectedSize = 1024;
            const mockFileDescriptor = {
                write: jest.fn().mockResolvedValue(undefined),
                close: jest.fn().mockResolvedValue(undefined)
            };

            (fs.promises.open as jest.Mock).mockResolvedValue(
                mockFileDescriptor
            );

            // Mock the initial range request to get content length
            nock("https://example.com")
                .get("/cache.tar.gz")
                .reply(206, "partial content", {
                    "content-range": `bytes 0-1/${expectedSize}`
                });

            // Mock the actual content download with wrong size (enough times for retries)
            nock("https://example.com")
                .get("/cache.tar.gz")
                .times(12)
                .reply(206, Buffer.alloc(512), {
                    "content-range": "bytes 0-511/1024"
                });

            await expect(
                downloadCacheHttpClientConcurrent(testUrl, testArchivePath, {
                    timeoutInMs: 30000,
                    partSize: 1024
                })
            ).rejects.toThrow(
                "Segment size mismatch: expected 1024 bytes but received 512"
            );
        });

        it("should succeed when downloaded size matches expected", async () => {
            const expectedSize = 1024;
            const testContent = Buffer.alloc(expectedSize);
            const mockFileDescriptor = {
                write: jest.fn().mockResolvedValue(undefined),
                close: jest.fn().mockResolvedValue(undefined)
            };

            (fs.promises.open as jest.Mock).mockResolvedValue(
                mockFileDescriptor
            );

            // Mock the initial range request
            nock("https://example.com")
                .get("/cache.tar.gz")
                .reply(206, "partial content", {
                    "content-range": `bytes 0-1/${expectedSize}`
                });

            // Mock the actual content download with correct size
            nock("https://example.com")
                .get("/cache.tar.gz")
                .reply(206, testContent, {
                    "content-range": `bytes 0-${
                        expectedSize - 1
                    }/${expectedSize}`
                });

            await expect(
                downloadCacheHttpClientConcurrent(testUrl, testArchivePath, {
                    timeoutInMs: 30000,
                    partSize: expectedSize
                })
            ).resolves.not.toThrow();
        });

        it("should throw when segment returns HTTP 200 instead of 206", async () => {
            const expectedSize = 1024;
            const mockFileDescriptor = {
                write: jest.fn().mockResolvedValue(undefined),
                close: jest.fn().mockResolvedValue(undefined)
            };

            (fs.promises.open as jest.Mock).mockResolvedValue(
                mockFileDescriptor
            );

            // Mock the initial range request (succeeds)
            nock("https://example.com")
                .get("/cache.tar.gz")
                .reply(206, "partial content", {
                    "content-range": `bytes 0-1/${expectedSize}`
                });

            // Mock the segment download returning 200 (full file) instead of 206
            nock("https://example.com")
                .get("/cache.tar.gz")
                .times(12) // segment retries + retryHttpClientResponse retries
                .reply(200, Buffer.alloc(expectedSize));

            await expect(
                downloadCacheHttpClientConcurrent(testUrl, testArchivePath, {
                    timeoutInMs: 30000,
                    partSize: expectedSize
                })
            ).rejects.toThrow("Segment download error: expected HTTP 206 but got 200");
        });

        it("should throw when segment returns wrong buffer length", async () => {
            const expectedSize = 1024;
            const mockFileDescriptor = {
                write: jest.fn().mockResolvedValue(undefined),
                close: jest.fn().mockResolvedValue(undefined)
            };

            (fs.promises.open as jest.Mock).mockResolvedValue(
                mockFileDescriptor
            );

            // Mock the initial range request
            nock("https://example.com")
                .get("/cache.tar.gz")
                .reply(206, "partial content", {
                    "content-range": `bytes 0-1/${expectedSize}`
                });

            // Mock the segment download returning wrong-size buffer with 206
            nock("https://example.com")
                .get("/cache.tar.gz")
                .times(12)
                .reply(206, Buffer.alloc(512), {
                    "content-range": `bytes 0-${expectedSize - 1}/${expectedSize}`
                });

            await expect(
                downloadCacheHttpClientConcurrent(testUrl, testArchivePath, {
                    timeoutInMs: 30000,
                    partSize: expectedSize
                })
            ).rejects.toThrow("Segment size mismatch: expected 1024 bytes but received 512");
        });

        it("should validate SHA-256 and throw on mismatch", async () => {
            const expectedSize = 1024;
            const testContent = Buffer.alloc(expectedSize, 0x42);
            const wrongHash = "0000000000000000000000000000000000000000000000000000000000000000";
            const mockFileDescriptor = {
                write: jest.fn().mockResolvedValue(undefined),
                close: jest.fn().mockResolvedValue(undefined)
            };

            (fs.promises.open as jest.Mock).mockResolvedValue(
                mockFileDescriptor
            );

            // Mock createReadStream so computeFileSha256 works without a real file
            (fs.createReadStream as jest.Mock).mockReturnValue(
                Readable.from(testContent) as any
            );

            // Mock the initial range request with SHA-256 metadata
            nock("https://example.com")
                .get("/cache.tar.gz")
                .reply(206, "partial content", {
                    "content-range": `bytes 0-1/${expectedSize}`,
                    "x-amz-meta-cache-sha256": wrongHash
                });

            // Mock the segment download
            nock("https://example.com")
                .get("/cache.tar.gz")
                .reply(206, testContent, {
                    "content-range": `bytes 0-${expectedSize - 1}/${expectedSize}`
                });

            await expect(
                downloadCacheHttpClientConcurrent(testUrl, testArchivePath, {
                    timeoutInMs: 30000,
                    partSize: expectedSize
                })
            ).rejects.toThrow("Download integrity failed: expected SHA-256");
        });

        it("should skip SHA-256 validation when metadata header is missing", async () => {
            const expectedSize = 1024;
            const testContent = Buffer.alloc(expectedSize);
            const mockFileDescriptor = {
                write: jest.fn().mockResolvedValue(undefined),
                close: jest.fn().mockResolvedValue(undefined)
            };

            (fs.promises.open as jest.Mock).mockResolvedValue(
                mockFileDescriptor
            );

            // Mock the initial range request WITHOUT SHA-256 metadata
            nock("https://example.com")
                .get("/cache.tar.gz")
                .reply(206, "partial content", {
                    "content-range": `bytes 0-1/${expectedSize}`
                    // No x-amz-meta-cache-sha256 header
                });

            // Mock the segment download
            nock("https://example.com")
                .get("/cache.tar.gz")
                .reply(206, testContent, {
                    "content-range": `bytes 0-${expectedSize - 1}/${expectedSize}`
                });

            // Should succeed without SHA-256 check (backward compatibility)
            await expect(
                downloadCacheHttpClientConcurrent(testUrl, testArchivePath, {
                    timeoutInMs: 30000,
                    partSize: expectedSize
                })
            ).resolves.not.toThrow();
        });

        it("should succeed when SHA-256 matches", async () => {
            const expectedSize = 1024;
            const testContent = Buffer.alloc(expectedSize, 0xAB);
            // Compute the real SHA-256 of the content
            const realHash = crypto
                .createHash("sha256")
                .update(testContent)
                .digest("hex");
            const mockFileDescriptor = {
                write: jest.fn().mockResolvedValue(undefined),
                close: jest.fn().mockResolvedValue(undefined)
            };

            (fs.promises.open as jest.Mock).mockResolvedValue(
                mockFileDescriptor
            );

            // Mock createReadStream so computeFileSha256 works without a real file
            (fs.createReadStream as jest.Mock).mockReturnValue(
                Readable.from(testContent) as any
            );

            // Mock the initial range request with correct SHA-256
            nock("https://example.com")
                .get("/cache.tar.gz")
                .reply(206, "partial content", {
                    "content-range": `bytes 0-1/${expectedSize}`,
                    "x-amz-meta-cache-sha256": realHash
                });

            // Mock the segment download
            nock("https://example.com")
                .get("/cache.tar.gz")
                .reply(206, testContent, {
                    "content-range": `bytes 0-${expectedSize - 1}/${expectedSize}`
                });

            await expect(
                downloadCacheHttpClientConcurrent(testUrl, testArchivePath, {
                    timeoutInMs: 30000,
                    partSize: expectedSize
                })
            ).resolves.not.toThrow();
        });
    });

    describe("restoreCache validation", () => {
        beforeEach(() => {
            // Mock environment variables for S3 backend
            process.env.RUNS_ON_S3_BUCKET_CACHE = "test-bucket";
            process.env.RUNS_ON_AWS_REGION = "us-east-1";
        });

        afterEach(() => {
            delete process.env.RUNS_ON_S3_BUCKET_CACHE;
            delete process.env.RUNS_ON_AWS_REGION;
        });

        it("should throw DownloadValidationError for empty files", async () => {
            // Mock the cache lookup to return a valid cache entry
            const mockCacheHttpClient = require("../src/custom/backend");
            jest.spyOn(mockCacheHttpClient, "getCacheEntry").mockResolvedValue({
                cacheKey: "test-key",
                archiveLocation: "https://s3.example.com/cache.tar.gz"
            });

            // Mock the download to succeed
            jest.spyOn(mockCacheHttpClient, "downloadCache").mockResolvedValue(
                undefined
            );

            // Mock utils to return 0 file size (empty file)
            const mockUtils = require("@actions/cache/lib/internal/cacheUtils");
            jest.spyOn(mockUtils, "getArchiveFileSizeInBytes").mockReturnValue(
                0
            );
            jest.spyOn(mockUtils, "createTempDirectory").mockResolvedValue(
                "/tmp"
            );
            jest.spyOn(mockUtils, "getCacheFileName").mockReturnValue(
                "cache.tar.gz"
            );

            const coreSpy = jest.spyOn(core, "warning");

            const result = await restoreCache(["/test/path"], "test-key");

            expect(result).toBeUndefined(); // Should return undefined on validation failure
            expect(coreSpy).toHaveBeenCalledWith(
                expect.stringContaining(
                    "Cache download validation failed: Downloaded cache archive is empty"
                )
            );
        });

        it("should succeed with valid file size", async () => {
            // Mock the cache lookup to return a valid cache entry
            const mockCacheHttpClient = require("../src/custom/backend");
            jest.spyOn(mockCacheHttpClient, "getCacheEntry").mockResolvedValue({
                cacheKey: "test-key",
                archiveLocation: "https://s3.example.com/cache.tar.gz"
            });

            // Mock the download to succeed
            jest.spyOn(mockCacheHttpClient, "downloadCache").mockResolvedValue(
                undefined
            );

            // Mock utils to return valid file size (>= 512 bytes)
            const mockUtils = require("@actions/cache/lib/internal/cacheUtils");
            jest.spyOn(mockUtils, "getArchiveFileSizeInBytes").mockReturnValue(
                1024
            );
            jest.spyOn(mockUtils, "createTempDirectory").mockResolvedValue(
                "/tmp"
            );
            jest.spyOn(mockUtils, "getCacheFileName").mockReturnValue(
                "cache.tar.gz"
            );
            jest.spyOn(mockUtils, "getCompressionMethod").mockResolvedValue(
                "gzip"
            );

            // Mock tar operations
            const mockTar = require("@actions/cache/lib/internal/tar");
            jest.spyOn(mockTar, "extractTar").mockResolvedValue(undefined);
            jest.spyOn(mockTar, "listTar").mockResolvedValue(undefined);

            const result = await restoreCache(["/test/path"], "test-key");

            expect(result).toBe("test-key"); // Should return the cache key on success
        });
    });
});
