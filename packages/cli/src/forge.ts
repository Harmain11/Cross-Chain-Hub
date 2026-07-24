import { AuraConfig } from "./config.js";

export type Chain = "EVM" | "SOLANA";

export interface ForgeEvent {
  phase: string;
  message?: string;
  project?: Record<string, unknown>;
}

export interface ForgeProject {
  id: number;
  contractName: string;
  ecosystem: Chain;
  status: string;
  smartContractCode?: string | null;
  testSuiteCode?: string | null;
  securityScore?: number | null;
  securityNotes?: string | null;
  gasNotes?: string | null;
  createdAt: string;
}

/** Extended project shape returned by GET /api/projects/:id — includes compiled artifacts. */
export interface FullForgeProject extends ForgeProject {
  compiledBytecode?: string | null;
  abiOrIdl?: string | null;
  networkSelected?: string | null;
  deploymentTxHash?: string | null;
  liveDeployedAddress?: string | null;
}

function headers(cfg: AuraConfig): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.apiKey) h["Authorization"] = `Bearer ${cfg.apiKey}`;
  return h;
}

/** Create a new forge job and return its id. */
export async function createForgeJob(
  cfg: AuraConfig,
  opts: { prompt: string; contractName: string; ecosystem: Chain; upgradeable?: boolean },
): Promise<number> {
  const url = `${cfg.apiUrl}/api/forge-contract`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers(cfg),
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { id: number };
  return data.id;
}

/** Stream forge pipeline events. `onEvent` is called for each event. */
export async function streamForgeJob(
  cfg: AuraConfig,
  id: number,
  onEvent: (ev: ForgeEvent) => void,
): Promise<ForgeProject> {
  const url = `${cfg.apiUrl}/api/forge-contract/${id}/stream`;
  const res = await fetch(url, { headers: headers(cfg) });

  if (!res.ok || !res.body) {
    throw new Error(`Stream error ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalProject: ForgeProject | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.trim();
      if (!line || line.startsWith(":")) continue; // heartbeat
      const dataLine = line.startsWith("data:") ? line.slice(5).trim() : line;
      if (!dataLine) continue;
      try {
        const ev: ForgeEvent = JSON.parse(dataLine);
        onEvent(ev);
        if (ev.phase === "done" && ev.project) {
          finalProject = ev.project as unknown as ForgeProject;
        }
      } catch {}
    }
  }

  if (!finalProject) throw new Error("Stream ended without a done event");
  return finalProject;
}

/** List the current user's projects. */
export async function listProjects(cfg: AuraConfig): Promise<ForgeProject[]> {
  const res = await fetch(`${cfg.apiUrl}/api/projects`, { headers: headers(cfg) });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return (await res.json()) as ForgeProject[];
}

/** Get a single project by id (includes compiledBytecode and abiOrIdl). */
export async function getProject(cfg: AuraConfig, id: number): Promise<FullForgeProject> {
  const res = await fetch(`${cfg.apiUrl}/api/projects/${id}`, { headers: headers(cfg) });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return (await res.json()) as FullForgeProject;
}

/** Record a completed deployment against a project. */
export async function recordDeployment(
  cfg: AuraConfig,
  projectId: number,
  opts: { networkSelected: string; deploymentTxHash: string; liveDeployedAddress: string },
): Promise<void> {
  const url = `${cfg.apiUrl}/api/projects/${projectId}/deploy`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: headers(cfg),
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to record deployment (${res.status}): ${body}`);
  }
}

/** Derive a clean contract name from a natural-language prompt. */
export function deriveContractName(prompt: string): string {
  // Extract noun phrase from common patterns
  const patterns = [
    /(?:build|create|make|write|generate)\s+(?:me\s+)?(?:a\s+)?([A-Za-z][A-Za-z\s]{2,30}?)(?:\s+contract|\s+where|\s+that|\s+which|$)/i,
    /([A-Za-z][A-Za-z\s]{2,20}?)\s+contract/i,
  ];
  for (const re of patterns) {
    const m = prompt.match(re);
    if (m?.[1]) {
      return m[1].trim().replace(/\s+/g, "").replace(/^./, c => c.toUpperCase());
    }
  }
  // Fall back to first 2 capitalised words
  const words = prompt.split(/\s+/).slice(0, 3).map(w => w.replace(/[^A-Za-z]/g, "")).filter(Boolean);
  return words.map(w => w[0].toUpperCase() + w.slice(1)).join("").slice(0, 24) || "MyContract";
}
