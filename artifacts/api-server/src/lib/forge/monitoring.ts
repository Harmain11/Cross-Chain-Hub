import { eq } from "drizzle-orm";
import { db, contractProjectsTable } from "@workspace/db";
import { getEvmRpcUrl } from "./chains";
import { logger } from "../logger";

interface JsonRpcLog {
  transactionHash: string;
  blockNumber: string;
}

async function rpcCall<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json()) as { error?: { message?: string }; result?: T };
  if (body.error) throw new Error(body.error.message ?? "RPC error");
  return body.result as T;
}

async function sendWebhookAlert(webhookUrl: string, payload: unknown): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch (err) {
    logger.warn({ err, webhookUrl }, "Monitoring webhook delivery failed");
    return false;
  }
}

/**
 * Checks every monitored EVM project for new activity (logs) since its
 * last-checked block, and fires a webhook alert when activity is found.
 * Best-effort per project — one project's failure never blocks the others.
 */
export async function pollMonitoredProjects(): Promise<void> {
  const projects = await db
    .select()
    .from(contractProjectsTable)
    .where(eq(contractProjectsTable.monitoringEnabled, true));

  for (const project of projects) {
    if (project.ecosystem !== "EVM" || !project.liveDeployedAddress || !project.networkSelected) {
      continue;
    }

    try {
      const rpcUrl = getEvmRpcUrl(project.networkSelected);
      if (!rpcUrl) continue;

      const latestHex = await rpcCall<string>(rpcUrl, "eth_blockNumber", []);
      const latestBlock = parseInt(latestHex, 16);

      const fromBlock = project.monitoringLastCheckedBlock
        ? parseInt(project.monitoringLastCheckedBlock, 10) + 1
        : Math.max(latestBlock - 500, 0); // first check: only look back a bounded window

      if (fromBlock > latestBlock) {
        await db
          .update(contractProjectsTable)
          .set({ monitoringLastCheckedAt: new Date() })
          .where(eq(contractProjectsTable.id, project.id));
        continue;
      }

      const logs = await rpcCall<JsonRpcLog[]>(rpcUrl, "eth_getLogs", [
        {
          address: project.liveDeployedAddress,
          fromBlock: `0x${fromBlock.toString(16)}`,
          toBlock: `0x${latestBlock.toString(16)}`,
        },
      ]);

      const now = new Date();

      if (logs.length > 0 && project.monitoringWebhookUrl) {
        await sendWebhookAlert(project.monitoringWebhookUrl, {
          projectId: project.id,
          contractName: project.contractName,
          network: project.networkSelected,
          address: project.liveDeployedAddress,
          newActivityCount: logs.length,
          transactions: logs.slice(0, 20).map((l) => ({
            txHash: l.transactionHash,
            blockNumber: parseInt(l.blockNumber, 16),
          })),
          detectedAt: now.toISOString(),
        });
      }

      if (logs.length > 0 && project.monitoringEmailAlertsEnabled) {
        // No transactional email provider is connected to this project yet.
        // Recording the detection is enough to keep monitoring state accurate;
        // wire an email connector (see integrations skill) to enable delivery.
        logger.info(
          { projectId: project.id },
          "Monitoring detected activity but no email provider is connected — skipping email alert",
        );
      }

      await db
        .update(contractProjectsTable)
        .set({
          monitoringLastCheckedBlock: String(latestBlock),
          monitoringLastCheckedAt: now,
          ...(logs.length > 0 ? { monitoringLastAlertAt: now } : {}),
        })
        .where(eq(contractProjectsTable.id, project.id));
    } catch (err) {
      logger.warn({ err, projectId: project.id }, "Monitoring poll failed for project");
    }
  }
}

let pollTimer: NodeJS.Timeout | null = null;

export function startMonitoringPoller(intervalMs = 60_000): void {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    pollMonitoredProjects().catch((err) => logger.error({ err }, "Monitoring poll cycle crashed"));
  }, intervalMs);
}
