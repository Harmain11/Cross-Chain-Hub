#!/usr/bin/env node
import readline from "readline";
import path from "path";
import os from "os";
import chalk from "chalk";
import ora from "ora";

import { resolveConfig, saveConfig, loadConfig } from "./config.js";
import { banner, c, icon, phaseLine, printHelp, scoreBar, header } from "./ui.js";
import { scanWorkspace, findFile, readFileSource, writeContract, writeTests } from "./workspace.js";
import {
  createForgeJob,
  streamForgeJob,
  listProjects,
  deriveContractName,
  getProject,
  recordDeployment,
  type Chain,
  type ForgeEvent,
} from "./forge.js";
import { deployEvm, deploySolana, resolveWalletKey } from "./deploy.js";
import { runLogin, runLogout, runSignup } from "./login.js";

// ─── CLI flags ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flagVal = (flag: string) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
};

// ─── Top-level subcommands (run and exit) ──────────────────────────────────────
const subcommand = args[0];

if (subcommand === "signup") {
  const apiUrl =
    flagVal("--api-url") ??
    process.env.AURA_FORGE_API_URL ??
    loadConfig().apiUrl;
  await runSignup(apiUrl);
  process.exit(0);
}

if (subcommand === "login") {
  const apiUrl =
    flagVal("--api-url") ??
    process.env.AURA_FORGE_API_URL ??
    loadConfig().apiUrl;
  await runLogin(apiUrl);
  process.exit(0);
}

if (subcommand === "logout") {
  const apiUrl =
    flagVal("--api-url") ??
    process.env.AURA_FORGE_API_URL ??
    loadConfig().apiUrl;
  await runLogout(apiUrl);
  process.exit(0);
}

if (subcommand === "whoami") {
  const cfg = loadConfig();
  if (cfg.apiKey) {
    const prefix = cfg.apiKey.slice(0, 8);
    console.log(`\n  ${c.green(icon.check)} Logged in  ${c.dim("·")}  key ${c.muted(prefix + "…")}\n`);
  } else {
    console.log(`\n  ${c.gold(icon.info)} Not logged in. Run ${c.cyan("aura-forge login")}\n`);
  }
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
  ${c.bold(c.white("aura-forge"))} [command] [options]

  ${c.muted("Commands:")}
    signup             Create a new account from the terminal
    login              Sign in with email + password (saves API key automatically)
    logout             Remove saved credentials
    whoami             Show whether you are currently logged in

  ${c.muted("Options:")}
    --api-url <url>    API server URL  (env: AURA_FORGE_API_URL)
    --api-key <key>    API key         (env: AURA_FORGE_API_KEY)
    --chain <evm|sol>  Default chain   (evm or sol)
    --out <dir>        Output directory for contracts
    --help             Show this help
`);
  process.exit(0);
}

// ─── Bootstrap ─────────────────────────────────────────────────────────────────
const cfg = resolveConfig({
  apiUrl: flagVal("--api-url"),
  apiKey: flagVal("--api-key"),
});

let chain: Chain = (flagVal("--chain")?.toUpperCase() === "SOLANA" ? "SOLANA" : cfg.defaultChain) as Chain;
const cwd = process.cwd();
const outDir = flagVal("--out") ?? path.join(cwd, "contracts");

// ─── Workspace scan ────────────────────────────────────────────────────────────
const workspace = scanWorkspace(cwd);

// ─── Readline REPL ─────────────────────────────────────────────────────────────
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
  prompt: "",
});

function prompt() {
  process.stdout.write(`\n  ${c.cyan(">")} `);
}

// ─── Forge a contract (generate + stream) ──────────────────────────────────────
async function forge(userPrompt: string, extraContext?: string) {
  if (!cfg.apiKey) {
    console.log();
    console.log(`  ${c.red(icon.cross)} Not logged in. Run ${c.cyan("aura-forge login")} to sign in.`);
    console.log(`  ${c.muted("Or paste a key with")} ${c.cyan("/key <your-api-key>")}`);
    return;
  }

  const fullPrompt = extraContext ? `${userPrompt}\n\n${extraContext}` : userPrompt;
  const contractName = deriveContractName(userPrompt);

  console.log();
  console.log(`  ${c.cyan(icon.forge)} ${c.bold(c.white(contractName))}  ${c.dim("·")}  ${c.dim(chain)}`);
  console.log();

  // Create job
  const spinner = ora({ text: c.muted("Creating forge job…"), indent: 2 }).start();
  let jobId: number;
  try {
    jobId = await createForgeJob(cfg, { prompt: fullPrompt, contractName, ecosystem: chain });
    spinner.stop();
  } catch (err) {
    spinner.fail(c.red(`Failed to start: ${err instanceof Error ? err.message : err}`));
    return;
  }

  // Stream pipeline
  const phasesSeen = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const phaseSpinners: Map<string, any> = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currentSpinner: any = null;

  const PHASE_ORDER = ["generating", "compiling", "healing", "auditing", "hardening", "testing"];

  function getOrCreate(phase: string): ReturnType<typeof ora> {
    if (!phaseSpinners.has(phase)) {
      const s = ora({ indent: 4, color: "cyan" }).start();
      phaseSpinners.set(phase, s);
      currentSpinner = s;
    }
    return phaseSpinners.get(phase)!;
  }

  try {
    const project = await streamForgeJob(cfg, jobId, (ev: ForgeEvent) => {
      if (ev.phase === "done") return;
      if (ev.phase === "error") {
        if (currentSpinner) currentSpinner.fail(c.red(ev.message ?? "Unknown error"));
        return;
      }

      const s = getOrCreate(ev.phase);
      const label = {
        generating: c.cyan("Generating"),
        compiling:  c.purple("Compiling"),
        healing:    c.gold("Self-healing"),
        auditing:   c.cyan("Auditing"),
        hardening:  c.gold("Hardening"),
        testing:    c.muted("Tests"),
      }[ev.phase] ?? c.muted(ev.phase);

      const msg = ev.message ?? "";
      const isScore = msg.match(/Security score:\s*(\d+)\/100/);

      if (isScore) {
        const score = parseInt(isScore[1]);
        s.text = `${label}  ${scoreBar(score)}`;
      } else {
        s.text = `${label}  ${c.muted(msg.length > 80 ? msg.slice(0, 77) + "…" : msg)}`;
      }
    });

    // Stop all spinners as success
    for (const [phase, s] of phaseSpinners) {
      const label = {
        generating: "Generated",
        compiling: "Compiled",
        healing: "Healed",
        auditing: `Audit score: ${project.securityScore ?? "?"}/100`,
        hardening: "Hardened",
        testing: "Tests generated",
      }[phase] ?? phase;
      s.succeed(c.dim(label));
    }

    console.log();

    // Save files
    const ext = chain === "SOLANA" ? ".rs" : ".sol";
    if (project.smartContractCode) {
      const saved = writeContract(outDir, contractName, ext, project.smartContractCode);
      const rel = path.relative(cwd, saved);
      console.log(`  ${c.green(icon.check)} Contract saved  ${c.dim("→")} ${c.white(rel)}`);
    }
    if (project.testSuiteCode) {
      const saved = writeTests(outDir, contractName, chain, project.testSuiteCode);
      const rel = path.relative(cwd, saved);
      console.log(`  ${c.green(icon.check)} Tests saved     ${c.dim("→")} ${c.white(rel)}`);
    }
    if (project.securityScore !== null && project.securityScore !== undefined) {
      console.log(`  ${c.green(icon.check)} Security score  ${scoreBar(project.securityScore)}`);
    }
    if (project.gasNotes) {
      console.log();
      console.log(`  ${c.muted("Gas notes:")} ${c.dim(project.gasNotes)}`);
    }
    console.log();
    console.log(`  ${c.dim("View on web →")} ${c.cyan(`${cfg.apiUrl}/projects/${project.id}`)}`);

  } catch (err) {
    if (currentSpinner) currentSpinner.fail(c.red(err instanceof Error ? err.message : String(err)));
  }
}

// ─── /audit command ────────────────────────────────────────────────────────────
async function auditFile(query: string) {
  const match = findFile(workspace, query);
  if (!match) {
    console.log(`  ${c.red(icon.cross)} No contract found matching ${c.white(query)}`);
    console.log(`  ${c.muted("Use")} ${c.cyan("/list")} ${c.muted("to see available contracts.")}`);
    return;
  }
  console.log();
  console.log(`  ${c.cyan(icon.dot)} Reading ${c.white(match.relPath)}`);
  const src = readFileSource(match);
  const auditPrompt = `Audit this existing ${match.chain} smart contract for security vulnerabilities, gas inefficiencies, and best-practice violations. Provide a detailed security score and remediation notes.\n\n${src}`;
  await forge(auditPrompt);
}

// ─── /deploy command ───────────────────────────────────────────────────────────
async function deployCommand(arg: string) {
  if (!cfg.apiKey) {
    console.log();
    console.log(`  ${c.red(icon.cross)} Not logged in. Run ${c.cyan("aura-forge login")} first.`);
    return;
  }

  // Resolve wallet key: env → config
  const walletKey = resolveWalletKey(cfg.walletPrivateKey);
  if (!walletKey) {
    console.log();
    console.log(`  ${c.red(icon.cross)} No wallet key configured.`);
    console.log(`  ${c.muted("Set one with")} ${c.cyan("/wallet <key>")} ${c.muted("or export")} ${c.cyan("AURA_FORGE_WALLET_KEY=<key>")}`);
    console.log(`  ${c.muted("EVM: hex private key   Solana: JSON byte-array or base58 secret key")}`);
    return;
  }

  // Resolve project ID — arg must be a numeric ID
  const projectId = parseInt(arg, 10);
  if (isNaN(projectId)) {
    console.log();
    console.log(`  ${c.red(icon.cross)} Provide a numeric project ID, e.g. ${c.cyan("/deploy 42")}`);
    console.log(`  ${c.muted("Find your project IDs in the web dashboard or via the API.")}`);
    return;
  }

  console.log();
  const spinner = ora({ text: c.muted(`Fetching project ${projectId}…`), indent: 2 }).start();
  let project;
  try {
    project = await getProject(cfg, projectId);
    spinner.stop();
  } catch (err) {
    spinner.fail(c.red(`Failed to fetch project: ${err instanceof Error ? err.message : err}`));
    return;
  }

  if (project.status !== "success" || !project.smartContractCode) {
    console.log(`  ${c.red(icon.cross)} Project ${projectId} is not in a deployable state (status: ${project.status}).`);
    return;
  }

  const networkLabel = project.ecosystem === "EVM" ? c.cyan("Sepolia") : c.purple("Devnet");
  console.log(`  ${c.cyan(icon.forge)} ${c.bold(c.white(project.contractName))}  ${c.dim("·")}  Deploying to ${networkLabel}`);
  console.log();

  const deploySpinner = ora({ text: c.muted("Deploying…"), indent: 2 }).start();
  try {
    const result = project.ecosystem === "EVM"
      ? await deployEvm(project, walletKey)
      : await deploySolana(project, walletKey);

    deploySpinner.succeed(c.green("Deployed"));

    console.log();
    console.log(`  ${c.green(icon.check)} Contract address  ${c.white(result.contractAddress)}`);
    console.log(`  ${c.green(icon.check)} Transaction hash  ${c.white(result.txHash)}`);
    console.log(`  ${c.dim("Explorer →")}  ${c.cyan(result.explorerUrl)}`);

    // Record the deployment on the server
    const recSpinner = ora({ text: c.muted("Recording deployment…"), indent: 2 }).start();
    try {
      await recordDeployment(cfg, projectId, {
        networkSelected: result.networkLabel,
        deploymentTxHash: result.txHash,
        liveDeployedAddress: result.contractAddress,
      });
      recSpinner.succeed(c.dim("Deployment recorded"));
    } catch (err) {
      recSpinner.warn(c.gold(`Could not record deployment: ${err instanceof Error ? err.message : err}`));
    }

    console.log();
    console.log(`  ${c.dim("View on web →")} ${c.cyan(`${cfg.apiUrl}/projects/${projectId}`)}`);

  } catch (err) {
    deploySpinner.fail(c.red(err instanceof Error ? err.message : String(err)));
  }
}

// ─── /faucet command ───────────────────────────────────────────────────────────
async function faucetCommand() {
  const walletKey = resolveWalletKey(cfg.walletPrivateKey);
  if (!walletKey) {
    console.log();
    console.log(`  ${c.red(icon.cross)} No wallet key configured.`);
    console.log(`  ${c.muted("Set one with")} ${c.cyan("/wallet <key>")} ${c.muted("then run")} ${c.cyan("/faucet")} ${c.muted("again.")}`);
    return;
  }

  if (chain === "EVM") {
    // ── Sepolia: derive address and print faucet links ──────────────────────
    const spinner = ora({ text: c.muted("Deriving wallet address…"), indent: 2 }).start();
    try {
      const { ethers } = await import("ethers");
      const wallet = new ethers.Wallet(walletKey);
      const address = wallet.address;
      spinner.stop();

      console.log();
      console.log(`  ${c.cyan(icon.forge)} ${c.bold(c.white("Sepolia Faucet"))}  ${c.dim("·")}  ${c.cyan("EVM")}`);
      console.log();
      console.log(`  ${c.green(icon.check)} Wallet address  ${c.white(address)}`);
      console.log();
      console.log(`  ${c.muted("Fund this address at one of the faucets below:")}`);
      console.log();
      console.log(`  ${c.dim(icon.dot)} ${c.cyan("https://sepoliafaucet.com")}`);
      console.log(`  ${c.dim(icon.dot)} ${c.cyan("https://www.alchemy.com/faucets/ethereum-sepolia")}`);
      console.log(`  ${c.dim(icon.dot)} ${c.cyan("https://faucet.quicknode.com/ethereum/sepolia")}`);
      console.log();
      console.log(`  ${c.muted("Copy your address above, paste it into any faucet, and request test ETH.")}`);
      console.log(`  ${c.muted("Once funded, run")} ${c.cyan("/deploy <project-id>")} ${c.muted("to deploy your contract.")}`);

      // Also fetch and show current balance if possible
      const rpcUrl = process.env.AURA_FORGE_EVM_RPC_URL ?? "https://rpc2.sepolia.org";
      const balSpinner = ora({ text: c.muted("Checking current balance…"), indent: 2 }).start();
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const bal = await provider.getBalance(address);
        const ethBal = ethers.formatEther(bal);
        balSpinner.succeed(c.dim(`Current balance: ${c.white(parseFloat(ethBal).toFixed(6))} ETH (Sepolia)`));
      } catch {
        balSpinner.stop();
        // Non-fatal — balance check failed, just skip it
      }
    } catch (err) {
      spinner.fail(c.red(`Could not derive wallet address: ${err instanceof Error ? err.message : err}`));
    }

  } else {
    // ── Devnet: request 1 SOL airdrop directly ──────────────────────────────
    const spinner = ora({ text: c.muted("Requesting 1 SOL airdrop from Devnet…"), indent: 2 }).start();
    try {
      const { Connection, LAMPORTS_PER_SOL } = await import("@solana/web3.js");
      const { parseSolanaKeypair } = await import("./deploy.js");
      const keypair = await parseSolanaKeypair(walletKey);
      const address = keypair.publicKey.toBase58();

      const rpcUrl = process.env.AURA_FORGE_SOL_RPC_URL ?? "https://api.devnet.solana.com";
      const connection = new Connection(rpcUrl, "confirmed");

      spinner.text = c.muted(`Airdropping 1 SOL to ${address.slice(0, 8)}…`);
      const sig = await connection.requestAirdrop(keypair.publicKey, LAMPORTS_PER_SOL);

      // Confirm the transaction
      spinner.text = c.muted("Confirming airdrop transaction…");
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");

      // Fetch resulting balance
      const lamports = await connection.getBalance(keypair.publicKey);
      const sol = lamports / LAMPORTS_PER_SOL;

      spinner.succeed(c.green("Airdrop confirmed"));

      console.log();
      console.log(`  ${c.purple(icon.solana)} ${c.bold(c.white("Solana Devnet Airdrop"))}  ${c.dim("·")}  ${c.purple("Devnet")}`);
      console.log();
      console.log(`  ${c.green(icon.check)} Wallet address    ${c.white(address)}`);
      console.log(`  ${c.green(icon.check)} Airdrop amount    ${c.white("1 SOL")}`);
      console.log(`  ${c.green(icon.check)} New balance       ${c.white(sol.toFixed(6))} SOL`);
      console.log(`  ${c.dim("Explorer →")}  ${c.cyan(`https://explorer.solana.com/tx/${sig}?cluster=devnet`)}`);
      console.log();
      console.log(`  ${c.muted("Run")} ${c.cyan("/faucet")} ${c.muted("again if you need more SOL (airdrop limit: 2 SOL per request).")}`);

    } catch (err) {
      spinner.fail(c.red(`Airdrop failed: ${err instanceof Error ? err.message : err}`));
      console.log();
      console.log(`  ${c.muted("Devnet faucet rate-limits requests. Try again in a minute, or visit:")}`);
      console.log(`  ${c.dim(icon.dot)} ${c.cyan("https://faucet.solana.com")}`);
    }
  }
}

// ─── /list command ─────────────────────────────────────────────────────────────
function listWorkspace() {
  console.log();
  if (workspace.length === 0) {
    console.log(`  ${c.muted("No .sol or .rs files found in")} ${c.white(cwd)}`);
    return;
  }
  console.log(`  ${c.bold(c.white("Workspace contracts"))}  ${c.dim("·")} ${c.muted(cwd)}`);
  console.log();
  for (const f of workspace) {
    const chainLabel = f.chain === "EVM" ? c.cyan("EVM") : c.purple("Solana");
    console.log(`  ${c.dim(icon.dot)} ${c.white(f.relPath.padEnd(44))} ${chainLabel}`);
  }
  console.log();
}

// ─── Main REPL ─────────────────────────────────────────────────────────────────
async function main() {
  banner();

  // Workspace summary
  if (workspace.length > 0) {
    const evmCount = workspace.filter(f => f.chain === "EVM").length;
    const solCount = workspace.filter(f => f.chain === "SOLANA").length;
    const parts = [];
    if (evmCount) parts.push(c.cyan(`${evmCount} Solidity`));
    if (solCount) parts.push(c.purple(`${solCount} Anchor/Rust`));
    console.log(`  ${c.dim(icon.dot)} Workspace  ${c.muted(cwd)}`);
    console.log(`  ${c.dim(icon.dot)} Contracts  ${parts.join(c.dim("  ·  "))}`);
  } else {
    console.log(`  ${c.dim(icon.dot)} Workspace  ${c.muted(cwd)}`);
    console.log(`  ${c.muted("  No contracts found yet — describe one to forge your first.")}`);
  }

  // Auth status — auto-login if no key is configured
  if (!cfg.apiKey) {
    console.log();
    console.log(`  ${c.gold(icon.info)} No API key found.`);
    console.log(`  ${c.muted("Starting login flow…  (Ctrl-C to skip)")} `);
    await runLogin(cfg.apiUrl);
    // Reload so the rest of the REPL picks up the newly saved key
    const fresh = resolveConfig({ apiUrl: flagVal("--api-url"), apiKey: flagVal("--api-key") });
    (cfg as any).apiKey = fresh.apiKey;
    if (!cfg.apiKey) {
      console.log(`  ${c.muted("Tip: run")} ${c.cyan("aura-forge login")} ${c.muted("any time to sign in, or")} ${c.cyan("/key <key>")} ${c.muted("to paste a key.")}`);
    }
  }

  console.log();
  console.log(`  ${c.muted("Type a description to forge a contract, or")} ${c.cyan("/help")} ${c.muted("for commands.")}`);
  console.log(`  ${c.muted("Active chain:")} ${chain === "EVM" ? c.cyan("EVM") : c.purple("Solana")}  ${c.dim("·")}  ${c.muted("Output:")} ${c.white(path.relative(cwd, outDir) || "contracts/")}`);
  console.log();

  prompt();

  rl.on("line", async (raw) => {
    const line = raw.trim();
    if (!line) { prompt(); return; }

    // ── Built-in commands ─────────────────────────────────────────────────────
    if (line === "/exit" || line === "/quit") {
      console.log(`\n  ${c.dim("Goodbye.")}\n`);
      process.exit(0);
    }

    if (line === "/help") {
      printHelp();
      prompt();
      return;
    }

    if (line === "/list") {
      listWorkspace();
      prompt();
      return;
    }

    if (line.startsWith("/chain ")) {
      const val = line.slice(7).trim().toUpperCase();
      if (val === "EVM" || val === "SOLANA") {
        chain = val as Chain;
        console.log(`  ${c.green(icon.check)} Default chain set to ${chain === "EVM" ? c.cyan("EVM") : c.purple("Solana")}`);
      } else {
        console.log(`  ${c.red(icon.cross)} Unknown chain. Use ${c.cyan("evm")} or ${c.cyan("solana")}.`);
      }
      prompt();
      return;
    }

    if (line.startsWith("/key ")) {
      const key = line.slice(5).trim();
      saveConfig({ apiKey: key });
      (cfg as any).apiKey = key;
      console.log(`  ${c.green(icon.check)} API key saved to ${c.muted("~/.aura-forge/config.json")}`);
      prompt();
      return;
    }

    if (line.startsWith("/wallet ")) {
      const key = line.slice(8).trim();
      saveConfig({ walletPrivateKey: key });
      (cfg as any).walletPrivateKey = key;
      console.log(`  ${c.green(icon.check)} Wallet key saved to ${c.muted("~/.aura-forge/config.json")}`);
      console.log(`  ${c.gold(icon.info)} Keep this file private — it contains your wallet key.`);
      prompt();
      return;
    }

    if (line === "/faucet") {
      await faucetCommand();
      prompt();
      return;
    }

    if (line.startsWith("/deploy ")) {
      const arg = line.slice(8).trim();
      await deployCommand(arg);
      prompt();
      return;
    }

    if (line.startsWith("/audit ")) {
      const query = line.slice(7).trim();
      await auditFile(query);
      prompt();
      return;
    }

    if (line.startsWith("/")) {
      console.log(`  ${c.red(icon.cross)} Unknown command. Type ${c.cyan("/help")} for available commands.`);
      prompt();
      return;
    }

    // ── Natural language forge ────────────────────────────────────────────────
    // Check if user references an existing file by name
    const ref = findFile(workspace, line);
    let extraCtx: string | undefined;
    if (ref) {
      console.log(`  ${c.dim(icon.dot)} Found ${c.white(ref.relPath)} in workspace — including as context`);
      extraCtx = readFileSource(ref);
    }

    await forge(line, extraCtx);
    prompt();
  });

  rl.on("close", () => {
    console.log(`\n  ${c.dim("Goodbye.")}\n`);
    process.exit(0);
  });
}

main().catch(err => {
  console.error(chalk.red("Fatal error:"), err);
  process.exit(1);
});
