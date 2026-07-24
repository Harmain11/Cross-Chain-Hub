import fs from "fs";
import path from "path";
import os from "os";

export interface AuraConfig {
  apiUrl: string;
  apiKey?: string;
  /** The server-assigned ID of the stored CLI API key; used to skip the list round-trip on logout. */
  apiKeyId?: number;
  defaultChain: "EVM" | "SOLANA";
  /** Private key for testnet deployments. EVM: hex key. Solana: JSON byte-array or base58. */
  walletPrivateKey?: string;
  /**
   * Custom Sepolia RPC URL saved interactively via `/config rpc evm <url>`.
   * Priority: AURA_FORGE_EVM_RPC_URL env var > this field > public fallbacks.
   */
  evmRpcUrl?: string;
  /**
   * Custom Solana devnet RPC URL saved interactively via `/config rpc sol <url>`.
   * Priority: AURA_FORGE_SOL_RPC_URL env var > this field > public fallbacks.
   */
  solRpcUrl?: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".aura-forge");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

const DEFAULTS: AuraConfig = {
  apiUrl: "https://aura-forge.replit.app",
  defaultChain: "EVM",
};

export function loadConfig(): AuraConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf8");
      return { ...DEFAULTS, ...JSON.parse(raw) };
    }
  } catch {}
  return { ...DEFAULTS };
}

export function saveConfig(cfg: Partial<AuraConfig>): void {
  const current = loadConfig();
  const next = { ...current, ...cfg };
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2));
}

export function resolveConfig(overrides: { apiUrl?: string; apiKey?: string }): AuraConfig {
  const base = loadConfig();
  return {
    ...base,
    apiUrl: overrides.apiUrl ?? process.env.AURA_FORGE_API_URL ?? base.apiUrl,
    apiKey: overrides.apiKey ?? process.env.AURA_FORGE_API_KEY ?? base.apiKey,
  };
}
