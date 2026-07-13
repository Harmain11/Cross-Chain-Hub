import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, contractProjectsTable } from "@workspace/db";
import {
  ListProjectsResponse,
  GetProjectsSummaryResponse,
  GetProjectResponse,
  RecordDeploymentBody,
  RecordDeploymentResponse,
  CreateHardenJobResponse,
  CreateHardenJobBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { runHardenOnlyPipeline } from "../lib/forge/pipeline";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/projects", async (req, res) => {
  const rows = await db
    .select()
    .from(contractProjectsTable)
    .where(eq(contractProjectsTable.userId, req.session.userId!))
    .orderBy(sql`${contractProjectsTable.createdAt} desc`);

  res.json(
    ListProjectsResponse.parse(
      rows.map((row) => ({
        id: row.id,
        contractName: row.contractName,
        ecosystem: row.ecosystem,
        status: row.status,
        securityScore: row.securityScore,
        parentProjectId: row.parentProjectId,
        networkSelected: row.networkSelected,
        deploymentTxHash: row.deploymentTxHash,
        liveDeployedAddress: row.liveDeployedAddress,
        createdAt: row.createdAt,
      })),
    ),
  );
});

router.get("/projects/summary", async (req, res) => {
  const rows = await db
    .select()
    .from(contractProjectsTable)
    .where(eq(contractProjectsTable.userId, req.session.userId!));

  const scored = rows.filter((row) => row.securityScore !== null);
  const averageSecurityScore =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, row) => sum + (row.securityScore ?? 0), 0) /
            scored.length,
        )
      : null;

  res.json(
    GetProjectsSummaryResponse.parse({
      totalProjects: rows.length,
      evmCount: rows.filter((row) => row.ecosystem === "EVM").length,
      solanaCount: rows.filter((row) => row.ecosystem === "SOLANA").length,
      deployedCount: rows.filter((row) => row.deploymentTxHash !== null)
        .length,
      averageSecurityScore,
    }),
  );
});

router.get("/projects/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db
    .select()
    .from(contractProjectsTable)
    .where(
      and(
        eq(contractProjectsTable.id, id),
        eq(contractProjectsTable.userId, req.session.userId!),
      ),
    )
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(GetProjectResponse.parse(row));
});

router.delete("/projects/:id", async (req, res) => {
  const id = Number(req.params.id);
  const deleted = await db
    .delete(contractProjectsTable)
    .where(
      and(
        eq(contractProjectsTable.id, id),
        eq(contractProjectsTable.userId, req.session.userId!),
      ),
    )
    .returning();

  if (deleted.length === 0) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.status(204).end();
});

router.patch("/projects/:id/deploy", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = RecordDeploymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid deployment payload" });
    return;
  }

  const [updated] = await db
    .update(contractProjectsTable)
    .set({
      networkSelected: parsed.data.networkSelected,
      deploymentTxHash: parsed.data.deploymentTxHash,
      liveDeployedAddress: parsed.data.liveDeployedAddress,
    })
    .where(
      and(
        eq(contractProjectsTable.id, id),
        eq(contractProjectsTable.userId, req.session.userId!),
      ),
    )
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(RecordDeploymentResponse.parse(updated));
});

router.post("/projects/:id/harden", async (req, res) => {
  const id = Number(req.params.id);
  const [parent] = await db
    .select()
    .from(contractProjectsTable)
    .where(
      and(
        eq(contractProjectsTable.id, id),
        eq(contractProjectsTable.userId, req.session.userId!),
      ),
    )
    .limit(1);

  if (!parent) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (parent.status !== "success" || !parent.smartContractCode) {
    res
      .status(400)
      .json({ error: "Only a successfully forged project can be hardened further" });
    return;
  }

  const parsedBody = CreateHardenJobBody.safeParse(req.body ?? {});
  const context = parsedBody.success ? parsedBody.data.context : undefined;

  const [child] = await db
    .insert(contractProjectsTable)
    .values({
      userId: req.session.userId!,
      prompt: parent.prompt,
      contractName: parent.contractName,
      ecosystem: parent.ecosystem,
      parentProjectId: parent.id,
      status: "pending",
      userContext: context && context.trim().length > 0 ? context.trim() : null,
    })
    .returning();

  if (!child) {
    res.status(500).json({ error: "Failed to create hardening job" });
    return;
  }

  res.status(201).json(CreateHardenJobResponse.parse(child));
});

router.get("/projects/:id/harden-stream", async (req, res) => {
  const id = Number(req.params.id);
  const [child] = await db
    .select()
    .from(contractProjectsTable)
    .where(
      and(
        eq(contractProjectsTable.id, id),
        eq(contractProjectsTable.userId, req.session.userId!),
      ),
    )
    .limit(1);

  if (!child || child.parentProjectId === null) {
    res.status(404).json({ error: "Hardening job not found" });
    return;
  }

  const [parent] = await db
    .select()
    .from(contractProjectsTable)
    .where(
      and(
        eq(contractProjectsTable.id, child.parentProjectId),
        eq(contractProjectsTable.userId, req.session.userId!),
      ),
    )
    .limit(1);

  if (!parent) {
    res.status(404).json({ error: "Source project not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (event: unknown) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const heartbeat = setInterval(() => res.write(": ping\n\n"), 15000);
  req.on("close", () => clearInterval(heartbeat));

  try {
    await runHardenOnlyPipeline(child, parent, send);
  } catch (err) {
    logger.error({ err }, "Hardening pipeline crashed");
    send({ phase: "error", message: "Hardening job crashed unexpectedly." });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});

export default router;
