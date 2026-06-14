import { getCacheVersion, getS3Prefix } from "../src/custom/prefix";

afterEach(() => {
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.RUNS_ON_S3_CACHE_SHARED_PREFIX;
});

test("S3 prefix uses RunsOn shared cache prefix when available", () => {
    process.env.GITHUB_REPOSITORY = "runs-on/monorepo";
    process.env.RUNS_ON_S3_CACHE_SHARED_PREFIX =
        "/cache/shared/runs-on/monorepo/";

    const paths = ["node_modules"];
    const version = getCacheVersion(paths);

    expect(
        getS3Prefix(paths, {
            compressionMethod: undefined,
            enableCrossOsArchive: false
        })
    ).toBe(`cache/shared/runs-on/monorepo/${version}`);
});

test("S3 prefix keeps legacy repository layout without RunsOn shared prefix", () => {
    process.env.GITHUB_REPOSITORY = "runs-on/monorepo";

    const paths = ["node_modules"];
    const version = getCacheVersion(paths);

    expect(
        getS3Prefix(paths, {
            compressionMethod: undefined,
            enableCrossOsArchive: false
        })
    ).toBe(`cache/runs-on/monorepo/${version}`);
});
