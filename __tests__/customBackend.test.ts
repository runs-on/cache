import * as core from "@actions/core";

import {
    findCacheObject,
    getCacheEntry,
    s3Client,
    selectCacheObject
} from "../src/custom/backend";
import { getReadS3Prefixes, getWriteS3Prefix } from "../src/custom/prefix";

afterEach(() => {
    delete process.env.RUNS_ON_S3_CACHE_READ_PREFIXES;
    delete process.env.RUNS_ON_S3_CACHE_WRITE_PREFIX;
    jest.restoreAllMocks();
});

const paths = ["node_modules"];
const options = {
    compressionMethod: undefined,
    enableCrossOsArchive: false
};

test("S3 write prefix uses the runner-provided writable scope", () => {
    process.env.RUNS_ON_S3_CACHE_WRITE_PREFIX = "/cache/repo/scopes/pr-7/";

    expect(getWriteS3Prefix(paths, options)).toMatch(
        /^cache\/repo\/scopes\/pr-7\/[a-f0-9]{64}$/
    );
});

test("S3 read prefixes preserve runner scope order and remove duplicates", () => {
    process.env.RUNS_ON_S3_CACHE_READ_PREFIXES = JSON.stringify([
        "/cache/repo/scopes/pr-7/",
        "cache/repo/scopes/branch-base",
        "cache/repo/scopes/pr-7"
    ]);

    const prefixes = getReadS3Prefixes(paths, options);
    expect(prefixes).toHaveLength(2);
    expect(prefixes[0]).toMatch(/^cache\/repo\/scopes\/pr-7\/[a-f0-9]{64}$/);
    expect(prefixes[1]).toMatch(
        /^cache\/repo\/scopes\/branch-base\/[a-f0-9]{64}$/
    );
});

test("invalid read-prefix JSON disables restore instead of falling back", () => {
    const warning = jest.spyOn(core, "warning").mockImplementation();
    process.env.RUNS_ON_S3_CACHE_READ_PREFIXES = "not-json";

    expect(getReadS3Prefixes(paths, options)).toEqual([]);
    expect(warning).toHaveBeenCalledWith(
        "RUNS_ON_S3_CACHE_READ_PREFIXES is invalid JSON; cache restore is disabled."
    );
});

test("read prefixes are capped", () => {
    const warning = jest.spyOn(core, "warning").mockImplementation();
    process.env.RUNS_ON_S3_CACHE_READ_PREFIXES = JSON.stringify([
        "scope/1",
        "scope/2",
        "scope/3",
        "scope/4",
        "scope/5"
    ]);

    expect(getReadS3Prefixes(paths, options)).toHaveLength(4);
    expect(warning).toHaveBeenCalledWith(
        "RUNS_ON_S3_CACHE_READ_PREFIXES has more than 4 prefixes; using the first 4."
    );
});

test("restore searches every key in the first scope before trying the next scope", async () => {
    process.env.RUNS_ON_S3_CACHE_READ_PREFIXES = JSON.stringify([
        "scope/pr",
        "scope/default"
    ]);
    const prefixes: string[] = [];
    const send = jest
        .spyOn(s3Client, "send")
        .mockImplementation(async command => {
            const input = command.input as { Prefix?: string };
            prefixes.push(input.Prefix || "");
            if (
                input.Prefix?.includes("scope/default") &&
                input.Prefix.endsWith("/primary")
            ) {
                return {
                    Contents: [
                        {
                            Key: input.Prefix,
                            LastModified: new Date("2026-01-01")
                        }
                    ]
                } as never;
            }
            return { Contents: [] } as never;
        });

    const entry = await getCacheEntry(["primary", "restore-"], paths, options);

    expect(entry.cacheKey).toBe("primary");
    expect(prefixes).toHaveLength(3);
    expect(prefixes[0]).toMatch(/^scope\/pr\/[a-f0-9]{64}\/primary$/);
    expect(prefixes[1]).toMatch(/^scope\/pr\/[a-f0-9]{64}\/restore-$/);
    expect(prefixes[2]).toMatch(/^scope\/default\/[a-f0-9]{64}\/primary$/);
    expect(send).toHaveBeenCalledTimes(3);
});

test("cache lookup follows ListObjectsV2 pagination", async () => {
    const send = jest
        .spyOn(s3Client, "send")
        .mockImplementation(async command => {
            const input = command.input as {
                Prefix?: string;
                ContinuationToken?: string;
            };
            if (!input.ContinuationToken) {
                return {
                    Contents: [
                        {
                            Key: "scope/default/version/Linux-go-old",
                            LastModified: new Date("2026-01-01")
                        }
                    ],
                    IsTruncated: true,
                    NextContinuationToken: "page-2"
                } as never;
            }
            return {
                Contents: [
                    {
                        Key: "scope/default/version/Linux-go-exact",
                        LastModified: new Date("2026-01-02")
                    }
                ],
                IsTruncated: false
            } as never;
        });

    const object = await findCacheObject(
        "scope/default/version",
        "Linux-go-exact"
    );

    expect(object?.Key).toBe("scope/default/version/Linux-go-exact");
    expect(send).toHaveBeenCalledTimes(2);
});

test("exact cache key wins over a newer partial key", () => {
    const prefix = "cache/repo/version";
    const exact = `${prefix}/Linux-go-abc`;
    const selected = selectCacheObject(
        [
            { Key: `${exact}-newer`, LastModified: new Date("2026-01-02") },
            { Key: exact, LastModified: new Date("2026-01-01") }
        ],
        exact
    );

    expect(selected?.Key).toBe(exact);
});

test("newest partial cache key is selected when exact key is absent", () => {
    const prefix = "cache/repo/version";
    const selected = selectCacheObject(
        [
            {
                Key: `${prefix}/Linux-go-old`,
                LastModified: new Date("2026-01-01")
            },
            {
                Key: `${prefix}/Linux-go-new`,
                LastModified: new Date("2026-01-02")
            }
        ],
        `${prefix}/Linux-go-exact`
    );

    expect(selected?.Key).toBe(`${prefix}/Linux-go-new`);
});
