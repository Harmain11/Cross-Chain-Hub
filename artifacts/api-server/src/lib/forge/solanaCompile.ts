// Real Anchor/Solana compilation via a lazily-installed, self-contained
// toolchain (Agave solana-cli + anchor-cli + a dedicated rustup instance).
//
// Why this exists: nixpkgs' solana-cli is pinned to an old version whose
// bundled platform-tools rustc (1.75) is too old to resolve today's
// crates.io dependency graph for anchor-lang (transitive deps now require
// `edition2024`). We instead install the official Agave release, which
// bundles a modern platform-tools rustc, into a dedicated cache directory.
// IDL generation additionally needs a toolchain new enough to accept
// `--cfg procmacro2_semver_exempt`; rather than downloading an actual
// nightly (which can hit environment disk quotas), we reuse the ambient
// Nix-provided stable Rust toolchain with `RUSTC_BOOTSTRAP=1`, which
// unlocks the same unstable-but-not-truly-nightly-only flag on stable
// rustc.
//
// If any step of this setup fails (no network, disk quota, etc.), compiles
// honestly report toolchain unavailability instead of faking success.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

const BASE_DIR = path.join(homedir(), ".cache", "aura-forge-solana-toolchain");
const RUSTUP_HOME = path.join(BASE_DIR, "rustup");
const CARGO_HOME = path.join(BASE_DIR, "cargo");
const SOLANA_INSTALL_ROOT = path.join(homedir(), ".local", "share", "solana", "install", "active_release", "bin");
const NIX_HOST_TOOLCHAIN = "nix-host";

const SETUP_TIMEOUT_MS = 5 * 60_000;
const BUILD_TIMEOUT_MS = 4 * 60_000;
const IDL_TIMEOUT_MS = 3 * 60_000;

interface ToolchainState {
  ready: boolean;
  reason?: string;
  env: NodeJS.ProcessEnv;
}

let toolchainPromise: Promise<ToolchainState> | null = null;

function baseEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: `${SOLANA_INSTALL_ROOT}:${path.join(CARGO_HOME, "bin")}:${process.env.PATH ?? ""}`,
    RUSTUP_HOME,
    CARGO_HOME,
  };
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function run(
  cmd: string,
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv; timeout?: number },
): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      cwd: opts.cwd,
      env: opts.env,
      timeout: opts.timeout ?? SETUP_TIMEOUT_MS,
      maxBuffer: 32 * 1024 * 1024,
    });
    return { stdout, stderr };
  } catch (err: any) {
    // execFile rejects with an Error that also has stdout/stderr attached.
    const stdout = typeof err?.stdout === "string" ? err.stdout : "";
    const stderr = typeof err?.stderr === "string" ? err.stderr : String(err?.message ?? err);
    const e = new Error(stderr || stdout || String(err));
    (e as any).stdout = stdout;
    (e as any).stderr = stderr;
    throw e;
  }
}

async function installSolanaCli(): Promise<void> {
  if (await pathExists(path.join(SOLANA_INSTALL_ROOT, "solana"))) return;
  // Official Agave installer; installs to ~/.local/share/solana regardless of cwd.
  await run("sh", ["-c", "curl -sSfL https://release.anza.xyz/stable/install | sh"], {
    timeout: SETUP_TIMEOUT_MS,
    env: process.env,
  });
}

async function installRustup(): Promise<void> {
  const rustupBin = path.join(CARGO_HOME, "bin", "rustup");
  if (await pathExists(rustupBin)) return;
  await mkdir(RUSTUP_HOME, { recursive: true });
  await mkdir(CARGO_HOME, { recursive: true });
  await run(
    "sh",
    [
      "-c",
      "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path --default-toolchain none",
    ],
    {
      timeout: SETUP_TIMEOUT_MS,
      env: { ...process.env, RUSTUP_HOME, CARGO_HOME },
    },
  );
}

async function linkNixHostToolchain(): Promise<void> {
  const rustupBin = path.join(CARGO_HOME, "bin", "rustup");
  const env = { ...process.env, RUSTUP_HOME, CARGO_HOME };
  const { stdout: sysroot } = await run("rustc", ["--print", "sysroot"], { env: process.env });
  const nixRoot = sysroot.trim();
  const { stdout: list } = await run(rustupBin, ["toolchain", "list"], { env });
  if (!list.includes(NIX_HOST_TOOLCHAIN)) {
    await run(rustupBin, ["toolchain", "link", NIX_HOST_TOOLCHAIN, nixRoot], { env });
  }
  if (!list.includes(`${NIX_HOST_TOOLCHAIN} (active, default)`)) {
    await run(rustupBin, ["default", NIX_HOST_TOOLCHAIN], { env });
  }
}

/**
 * Lazily installs and verifies the Solana/Anchor toolchain, caching the
 * result (success or failure) for the lifetime of the process.
 */
export function ensureSolanaToolchain(): Promise<ToolchainState> {
  if (!toolchainPromise) {
    toolchainPromise = (async (): Promise<ToolchainState> => {
      try {
        await mkdir(BASE_DIR, { recursive: true });
        await installSolanaCli();
        await installRustup();
        await linkNixHostToolchain();

        const env = baseEnv();
        await run("anchor", ["--version"], { env, timeout: 30_000 });
        await run("cargo-build-sbf", ["--version"], { env, timeout: 30_000 });

        return { ready: true, env };
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        return {
          ready: false,
          reason: `Solana/Anchor toolchain setup failed: ${reason.slice(0, 2000)}`,
          env: baseEnv(),
        };
      }
    })();
  }
  return toolchainPromise;
}

function toSnakeCase(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, "_");
  return cleaned
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "") || "program";
}

export interface AnchorCompileResult {
  success: boolean;
  toolchainUnavailable?: boolean;
  /** Base64-encoded .so bytecode, present only on success. */
  soBase64?: string;
  soSizeBytes?: number;
  /** Real IDL JSON produced by `anchor idl build`, present only on success. */
  idl?: string;
  /** Real rent-exemption minimum (lamports) for an account sized to the compiled program, if computable. */
  rentExemptLamports?: number;
  /** Combined stdout/stderr, truncated, for surfacing compiler diagnostics. */
  log: string;
}

/**
 * Compiles Anchor (Rust) source to a real .so binary via cargo-build-sbf,
 * then (optionally) generates the real IDL via `anchor idl build`.
 * Pass `skipIdl: true` for intermediate validation compiles to save the
 * 3-minute `anchor idl build` step — only the final save needs a real IDL.
 * `buildDir` should be reused across repair/harden attempts for the same
 * project so incremental cargo compilation keeps subsequent attempts fast;
 * the caller owns its cleanup.
 */
export async function compileAnchorProgram(
  code: string,
  contractName: string,
  buildDir: string,
  { skipIdl = false }: { skipIdl?: boolean } = {},
): Promise<AnchorCompileResult> {
  const toolchain = await ensureSolanaToolchain();
  if (!toolchain.ready) {
    return { success: false, toolchainUnavailable: true, log: toolchain.reason ?? "Toolchain unavailable." };
  }

  const pkgName = toSnakeCase(contractName);
  const programDir = path.join(buildDir, "programs", pkgName);
  await mkdir(programDir, { recursive: true });
  await mkdir(path.join(programDir, "src"), { recursive: true });

  await writeFile(
    path.join(buildDir, "Cargo.toml"),
    `[workspace]\nmembers = ["programs/*"]\nresolver = "2"\n\n[profile.release]\noverflow-checks = true\nlto = "fat"\ncodegen-units = 1\n\n[profile.release.build-override]\nopt-level = 3\nincremental = false\ncodegen-units = 1\n`,
  );
  await writeFile(
    path.join(programDir, "Cargo.toml"),
    `[package]\nname = "${pkgName}"\nversion = "0.1.0"\nedition = "2021"\n\n[lib]\ncrate-type = ["cdylib", "lib"]\nname = "${pkgName}"\n\n[features]\ndefault = []\ncpi = ["no-entrypoint"]\nno-entrypoint = []\nno-idl = []\nno-log-ix-name = []\nidl-build = ["anchor-lang/idl-build"]\n\n[dependencies]\nanchor-lang = "0.31.1"\n`,
  );
  await writeFile(
    path.join(buildDir, "Anchor.toml"),
    `[toolchain]\n\n[features]\nresolution = true\nskip-lint = false\n\n[programs.localnet]\n${pkgName} = "11111111111111111111111111111111"\n\n[registry]\nurl = "https://api.apr.dev"\n\n[provider]\ncluster = "localnet"\nwallet = "~/.config/solana/id.json"\n\n[scripts]\ntest = "true"\n`,
  );
  await writeFile(path.join(programDir, "src", "lib.rs"), code);

  const env = baseEnv();
  let buildStdout = "";
  let buildStderr = "";
  try {
    const res = await run(
      "cargo-build-sbf",
      ["--manifest-path", path.join(programDir, "Cargo.toml")],
      { cwd: buildDir, env, timeout: BUILD_TIMEOUT_MS },
    );
    buildStdout = res.stdout;
    buildStderr = res.stderr;
  } catch (err: any) {
    const stdout = err?.stdout ?? "";
    const stderr = err?.stderr ?? String(err?.message ?? err);
    return {
      success: false,
      log: `cargo-build-sbf failed:\n${(stdout + "\n" + stderr).slice(-8000)}`,
    };
  }

  const soPath = path.join(buildDir, "target", "deploy", `${pkgName}.so`);
  let soBuffer: Buffer;
  try {
    soBuffer = await readFile(soPath);
  } catch {
    return {
      success: false,
      log: `Build reported success but no .so was produced at ${soPath}.\n${(buildStdout + "\n" + buildStderr).slice(-4000)}`,
    };
  }

  // Real IDL, generated by actually compiling+running the program's
  // idl-build feature (not an LLM guess). Falls back to nix-host stable
  // rustc with RUSTC_BOOTSTRAP=1 instead of a true nightly toolchain.
  // Skipped for intermediate validation compiles (skipIdl=true) to save ~3min.
  let idl: string | undefined;
  let idlLog = "";
  if (!skipIdl) {
    try {
      const idlEnv = { ...env, RUSTUP_TOOLCHAIN: NIX_HOST_TOOLCHAIN, RUSTC_BOOTSTRAP: "1" };
      const { stdout } = await run("anchor", ["idl", "build"], {
        cwd: buildDir,
        env: idlEnv,
        timeout: IDL_TIMEOUT_MS,
      });
      const lines = stdout.split("\n");
      const testResultIdx = lines.findIndex((l) => l.startsWith("test result:"));
      const jsonText = (testResultIdx >= 0 ? lines.slice(testResultIdx + 1) : lines).join("\n").trim();
      JSON.parse(jsonText); // validate
      idl = jsonText;
    } catch (err: any) {
      idlLog = `\nIDL generation failed (program compiled successfully, but a real IDL could not be produced): ${(err?.stderr ?? err?.message ?? String(err)).toString().slice(-2000)}`;
    }
  }

  // Real rent-exemption cost for an account sized to the compiled program,
  // computed by the actual Solana CLI (not an LLM guess).
  let rentExemptLamports: number | undefined;
  try {
    const { stdout } = await run("solana", ["rent", String(soBuffer.length), "--lamports"], {
      env,
      timeout: 20_000,
    });
    const match = stdout.match(/(\d[\d,]*)\s*lamports/i);
    if (match) rentExemptLamports = Number(match[1].replace(/,/g, ""));
  } catch {
    // Non-fatal: rent estimate is a bonus metric, not required for success.
  }

  return {
    success: true,
    soBase64: soBuffer.toString("base64"),
    soSizeBytes: soBuffer.length,
    idl,
    rentExemptLamports,
    log: `cargo-build-sbf succeeded. Program binary: ${soBuffer.length} bytes.${idl ? " Real IDL generated via anchor idl build." : idlLog}`,
  };
}

export async function withTempBuildDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), "aura-forge-anchor-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
