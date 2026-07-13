import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, contractProjectsTable } from "@workspace/db";
import {
  ListProjectsResponse,
  GetProjectsSummaryResponse,
  GetProjectResponse,
  RecordDeploymentBody,
  RecordDeploymentResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

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

export default router;
