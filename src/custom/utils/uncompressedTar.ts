import * as utils from "@actions/cache/lib/internal/cacheUtils";
import {
    ArchiveToolType,
    CompressionMethod,
    ManifestFilename,
    SystemTarPathOnWindows
} from "@actions/cache/lib/internal/constants";
import type { ExecOptions } from "@actions/exec";
import { exec } from "@actions/exec";
import * as io from "@actions/io";
import { existsSync, writeFileSync } from "fs";
import * as path from "path";

interface TarToolInfo {
    path: string;
    type: ArchiveToolType;
}

async function getTarTool(): Promise<TarToolInfo> {
    switch (process.platform) {
        case "win32": {
            const gnuTar = await utils.getGnuTarPathOnWindows();
            if (gnuTar) {
                return {
                    path: gnuTar,
                    type: ArchiveToolType.GNU
                };
            }
            if (existsSync(SystemTarPathOnWindows)) {
                return {
                    path: SystemTarPathOnWindows,
                    type: ArchiveToolType.BSD
                };
            }
            break;
        }
        case "darwin": {
            const gnuTar = await io.which("gtar", false);
            if (gnuTar) {
                return { path: gnuTar, type: ArchiveToolType.GNU };
            }
            return {
                path: await io.which("tar", true),
                type: ArchiveToolType.BSD
            };
        }
        default:
            break;
    }

    return {
        path: await io.which("tar", true),
        type: ArchiveToolType.GNU
    };
}

function getWorkingDirectory(): string {
    return process.env["GITHUB_WORKSPACE"] ?? process.cwd();
}

function normalizeForTar(targetPath: string): string {
    return targetPath.replace(new RegExp(`\\${path.sep}`, "g"), "/");
}

function appendPlatformSpecificArgs(tool: TarToolInfo, args: string[]): void {
    if (tool.type === ArchiveToolType.GNU) {
        if (process.platform === "win32") {
            args.push("--force-local");
        } else if (process.platform === "darwin") {
            args.push("--delay-directory-restore");
        }
    }
}

function sanitizeEnv(env: NodeJS.ProcessEnv): { [key: string]: string } {
    const sanitized: { [key: string]: string } = {};
    for (const [key, value] of Object.entries(env)) {
        if (value !== undefined) {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

function getExecEnv(): { [key: string]: string } {
    return sanitizeEnv({ ...process.env, MSYS: "winsymlinks:nativestrict" });
}

async function runTar(
    tool: TarToolInfo,
    args: string[],
    options?: ExecOptions & { cwd?: string }
): Promise<void> {
    await exec(`"${tool.path}"`, args, options);
}

export async function createTar(
    archiveFolder: string,
    sourceDirectories: string[],
    compressionMethod: CompressionMethod
): Promise<void> {
    const tool = await getTarTool();
    const cacheFileName = utils.getCacheFileName(compressionMethod);
    const normalizedArchiveName = normalizeForTar(cacheFileName);
    const normalizedManifestPath = normalizeForTar(
        path.join(archiveFolder, ManifestFilename)
    );
    const workingDirectory = normalizeForTar(getWorkingDirectory());

    writeFileSync(normalizedManifestPath, sourceDirectories.join("\n"));

    const args = [
        "--posix",
        "-cf",
        normalizedArchiveName,
        "--exclude",
        normalizedArchiveName,
        "-P",
        "-C",
        workingDirectory,
        "--files-from",
        ManifestFilename
    ];

    appendPlatformSpecificArgs(tool, args);

    await runTar(tool, args, {
        cwd: archiveFolder,
        env: getExecEnv()
    });
}

export async function extractTar(
    archivePath: string,
    _compressionMethod: CompressionMethod
): Promise<void> {
    void _compressionMethod;
    const tool = await getTarTool();
    const workingDirectory = normalizeForTar(getWorkingDirectory());

    await io.mkdirP(workingDirectory);

    const args = [
        "-xf",
        normalizeForTar(archivePath),
        "-P",
        "-C",
        workingDirectory
    ];

    appendPlatformSpecificArgs(tool, args);

    await runTar(tool, args, {
        env: getExecEnv()
    });
}

export async function listTar(
    archivePath: string,
    _compressionMethod: CompressionMethod
): Promise<void> {
    void _compressionMethod;
    const tool = await getTarTool();

    const args = ["-tf", normalizeForTar(archivePath), "-P"];

    appendPlatformSpecificArgs(tool, args);

    await runTar(tool, args, {
        env: getExecEnv()
    });
}
