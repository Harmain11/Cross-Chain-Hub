import chalk from "chalk";

// ─── Brand colours ───────────────────────────────────────────────────────────
export const c = {
  cyan:   (s: string) => chalk.hex("#00C2FF")(s),
  purple: (s: string) => chalk.hex("#9F58FA")(s),
  gold:   (s: string) => chalk.hex("#F5A623")(s),
  dim:    (s: string) => chalk.hex("#4A5A70")(s),
  muted:  (s: string) => chalk.hex("#7A8BA0")(s),
  white:  (s: string) => chalk.hex("#F0F4FF")(s),
  green:  (s: string) => chalk.hex("#00D4AA")(s),
  red:    (s: string) => chalk.hex("#FF5C6A")(s),
  bold:   (s: string) => chalk.bold(s),
};

// ─── Icons ───────────────────────────────────────────────────────────────────
export const icon = {
  forge:    "⬡",
  solana:   "◎",
  check:    "✓",
  cross:    "✗",
  arrow:    "→",
  dot:      "•",
  spark:    "✦",
  bar:      "│",
  corner:   "╭",
  info:     "ℹ",
};

// ─── Score bar ────────────────────────────────────────────────────────────────
export function scoreBar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  const empty  = width - filled;
  const color  = score >= 90 ? c.green : score >= 70 ? c.gold : c.red;
  return color("█".repeat(filled)) + c.dim("░".repeat(empty)) + " " + color(`${score}/100`);
}

// ─── Phase display ────────────────────────────────────────────────────────────
export const phaseLabel: Record<string, string> = {
  generating: c.cyan("Generating"),
  compiling:  c.purple("Compiling"),
  healing:    c.gold("Self-healing"),
  auditing:   c.cyan("Auditing"),
  hardening:  c.gold("Hardening"),
  testing:    c.muted("Tests"),
  done:       c.green("Complete"),
  error:      c.red("Error"),
};

export function phaseLine(phase: string, message: string): string {
  const label = phaseLabel[phase] ?? c.muted(phase);
  return `  ${c.dim(icon.bar)} ${label}  ${c.muted(message)}`;
}

// ─── Banner ───────────────────────────────────────────────────────────────────
export function banner(): void {
  console.log();
  console.log(
    `  ${c.cyan(icon.forge)} ${c.bold(c.white("AURA Forge"))}  ${c.dim("v0.1.0")}  ${c.dim("·")}  ${c.dim("AI Smart Contract Factory")}`
  );
  console.log(
    `  ${c.dim("EVM + Solana")}  ${c.dim("·")}  ${c.dim("Generate  Compile  Audit  Harden")}`
  );
  console.log();
}

// ─── Section header ───────────────────────────────────────────────────────────
export function header(label: string): void {
  console.log(`  ${c.dim("─".repeat(54))}`);
  console.log(`  ${c.muted(label)}`);
  console.log();
}

// ─── Help ─────────────────────────────────────────────────────────────────────
export function printHelp(): void {
  console.log();
  console.log(`  ${c.bold(c.white("Commands"))}`);
  console.log();
  const cmds: [string, string][] = [
    ["/audit <file>",       "Audit an existing .sol or .rs contract in your workspace"],
    ["/deploy <project-id>","Deploy a forged contract to Sepolia (EVM) or Devnet (Solana)"],
    ["/balance",            "Show current wallet balance (SOL/ETH) without triggering an airdrop"],
    ["/faucet",             "Fund your testnet wallet (EVM: prints faucet links; Solana: airdrops 1 SOL)"],
    ["/list",               "List all contracts found in the current workspace"],
    ["/chain [evm|solana]", "Switch default chain (current session)"],
    ["/wallet <key>",       "Set wallet private key for deployments (saved to config)"],
    ["/save <path>",        "Set output directory for generated contracts"],
    ["/key <api-key>",      "Paste an API key directly (or run aura-forge login instead)"],
    ["/help",               "Show this help"],
    ["/exit",               "Quit"],
  ];
  for (const [cmd, desc] of cmds) {
    console.log(`  ${c.cyan(cmd.padEnd(28))} ${c.muted(desc)}`);
  }
  console.log();
  console.log(`  ${c.bold(c.white("Auth"))}`);
  console.log();
  const authCmds: [string, string][] = [
    ["aura-forge signup",   "Create a new account from the terminal"],
    ["aura-forge login",    "Sign in with email + password (run outside the REPL)"],
    ["aura-forge logout",   "Remove saved credentials"],
    ["aura-forge whoami",   "Show current login status"],
  ];
  for (const [cmd, desc] of authCmds) {
    console.log(`  ${c.cyan(cmd.padEnd(28))} ${c.muted(desc)}`);
  }
  console.log();
  console.log(`  ${c.muted("Or just type a plain-English description to forge a contract:")}`);
  console.log(`  ${c.dim("e.g.")} ${c.white('"Build me a staking contract where users earn 8% APY"')}`);
  console.log();
}
