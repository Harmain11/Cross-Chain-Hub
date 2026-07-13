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
  GetProjectLineageResponse,
  UpdateMonitoringConfigBody,
  UpdateMonitoringConfigResponse,
  UpdateProjectCodeBody,
  UpdateProjectCodeResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { runHardenOnlyPipeline } from "../lib/forge/pipeline";
import { streamProjectExport } from "../lib/forge/exportProject";
import { verifyEvmDeployment } from "../lib/forge/verification";
import { getTeamRole } from "../lib/teams/access";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.use(requireAuth);

// Resolves the `?teamId=` query param into a where-clause scope: the caller's
// personal projects (teamId is null) by default, or a team's shared projects
// if the caller is a member of that team. Returns null (caller should 403) if
// a teamId was given but the caller isn't a member.
async function resolveProjectScope(req: { session: { userId?: number } }, teamIdParam: unknown) {
  if (teamIdParam === undefined) {
    return and(
      eq(contractProjectsTable.userId, req.session.userId!),
      sql`${contractProjectsTable.teamId} is null`,
    );
  }
  const teamId = Number(teamIdParam);
  if (Number.isNaN(teamId)) return undefined;
  const role = await getTeamRole(req.session.userId!, teamId);
  if (!role) return null;
  return eq(contractProjectsTable.teamId, teamId);
}

router.get("/projects", async (req, res) => {
  const scope = await resolveProjectScope(req, req.query.teamId);
  if (scope === null) {
    res.status(403).json({ error: "You are not a member of this team" });
    return;
  }
  if (scope === undefined) {
    res.status(400).json({ error: "Invalid teamId" });
    return;
  }

  const rows = await db
    .select()
    .from(contractProjectsTable)
    .where(scope)
    .orderBy(sql`${contractProjectsTable.createdAt} desc`);

  res.json(
    ListProjectsResponse.parse(
      rows.map((row) => ({
        id: row.id,
        teamId: row.teamId,
        contractName: row.contractName,
        ecosystem: row.ecosystem,
        status: row.status,
        templateId: row.templateId,
        upgradeable: row.upgradeable,
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
  const scope = await resolveProjectScope(req, req.query.teamId);
  if (scope === null) {
    res.status(403).json({ error: "You are not a member of this team" });
    return;
  }
  if (scope === undefined) {
    res.status(400).json({ error: "Invalid teamId" });
    return;
  }

  const rows = await db
    .select()
    .from(contractProjectsTable)
    .where(scope);

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

// A project is readable by its creator, or by any member of the team it
// belongs to. Returns the row and the caller's team role (null if personal
// or not a team project), or null if the caller has no access at all.
async function loadAccessibleProject(userId: number, id: number) {
  const [row] = await db
    .select()
    .from(contractProjectsTable)
    .where(eq(contractProjectsTable.id, id))
    .limit(1);

  if (!row) return null;
  if (row.userId === userId) return { row, teamRole: null as "owner" | "member" | null };
  if (row.teamId != null) {
    const role = await getTeamRole(userId, row.teamId);
    if (role) return { row, teamRole: role };
  }
  return null;
}

router.get("/projects/:id", async (req, res) => {
  const id = Number(req.params.id);
  const accessible = await loadAccessibleProject(req.session.userId!, id);

  if (!accessible) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(GetProjectResponse.parse(accessible.row));
});

// Returns the full version lineage containing this project: every ancestor
// (walking parentProjectId up to the root) followed by this project and its
// descendants (walking down; if a version was branched more than once, the
// most recently created child at each step is followed), ordered oldest first.
router.get("/projects/:id/lineage", async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.session.userId!;

  const anchorAccess = await loadAccessibleProject(userId, id);
  if (!anchorAccess) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Lineage entries are scoped the same way the anchor project was accessed:
  // the caller's own projects, plus the anchor's team's projects if it's a
  // team project (personal lineages never leak into a team's).
  const scope =
    anchorAccess.row.teamId != null
      ? eq(contractProjectsTable.teamId, anchorAccess.row.teamId)
      : eq(contractProjectsTable.userId, userId);

  const allRows = await db
    .select()
    .from(contractProjectsTable)
    .where(scope)
    .orderBy(sql`${contractProjectsTable.createdAt} asc`);

  const byId = new Map(allRows.map((r) => [r.id, r]));
  const anchor = byId.get(id);
  if (!anchor) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const ancestors: typeof allRows = [];
  let cursor = anchor;
  while (cursor.parentProjectId !== null) {
    const parent = byId.get(cursor.parentProjectId);
    if (!parent) break;
    ancestors.unshift(parent);
    cursor = parent;
  }

  const descendants: typeof allRows = [];
  cursor = anchor;
  while (true) {
    const children = allRows.filter((r) => r.parentProjectId === cursor.id);
    if (children.length === 0) break;
    const next = children.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
    descendants.push(next);
    cursor = next;
  }

  const chain = [...ancestors, anchor, ...descendants];

  res.json(GetProjectLineageResponse.parse(chain));
});

router.get("/projects/:id/export", async (req, res) => {
  const id = Number(req.params.id);
  const accessible = await loadAccessibleProject(req.session.userId!, id);

  if (!accessible) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const { row } = accessible;

  if (row.status !== "success" || !row.smartContractCode) {
    res.status(400).json({ error: "Only a successfully forged project can be exported" });
    return;
  }

  streamProjectExport(row, res);
});

router.delete("/projects/:id", async (req, res) => {
  const id = Number(req.params.id);
  const accessible = await loadAccessibleProject(req.session.userId!, id);

  if (!accessible) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Team members may only delete their own projects; the team owner can
  // delete any project in the team. Personal (non-team) projects always
  // require ownership, which loadAccessibleProject already guarantees.
  if (
    accessible.row.teamId != null &&
    accessible.teamRole === "member" &&
    accessible.row.userId !== req.session.userId
  ) {
    res.status(403).json({ error: "Only the project creator or team owner can delete this project" });
    return;
  }

  const deleted = await db
    .delete(contractProjectsTable)
    .where(eq(contractProjectsTable.id, id))
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

  const accessible = await loadAccessibleProject(req.session.userId!, id);
  if (!accessible) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [updated] = await db
    .update(contractProjectsTable)
    .set({
      networkSelected: parsed.data.networkSelected,
      deploymentTxHash: parsed.data.deploymentTxHash,
      liveDeployedAddress: parsed.data.liveDeployedAddress,
      // Reset any prior verification state — this is a fresh deployment/address.
      verificationStatus: accessible.row.ecosystem === "EVM" ? "pending" : null,
      verificationUrl: null,
      verificationError: null,
    })
    .where(eq(contractProjectsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(RecordDeploymentResponse.parse(updated));

  // Fire-and-forget: verification never blocks or rolls back the deployment
  // record itself. EVM only for now (see lib/forge/verification.ts).
  if (
    updated.ecosystem === "EVM" &&
    updated.smartContractCode &&
    updated.liveDeployedAddress
  ) {
    void verifyEvmDeployment({
      networkLabel: updated.networkSelected!,
      contractName: updated.contractName,
      sourceCode: updated.smartContractCode,
      address: updated.liveDeployedAddress,
    })
      .then((outcome) =>
        db
          .update(contractProjectsTable)
          .set({
            verificationStatus: outcome.status,
            verificationUrl: outcome.url,
            verificationError: outcome.error,
          })
          .where(eq(contractProjectsTable.id, id)),
      )
      .catch((err) => logger.error({ err, projectId: id }, "Verification pipeline crashed"));
  }
});

// Statuses where a background job still owns the row; edits are rejected
// while one of these is in flight to avoid racing the pipeline's own writes.
const IN_FLIGHT_STATUSES = new Set(["pending", "generating", "compiling", "healing", "hardening"]);

router.patch("/projects/:id/code", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateProjectCodeBody.safeParse(req.body);
  if (!parsed.success || (parsed.data.smartContractCode === undefined && parsed.data.testSuiteCode === undefined)) {
    res.status(400).json({ error: "Provide smartContractCode and/or testSuiteCode" });
    return;
  }

  const accessible = await loadAccessibleProject(req.session.userId!, id);
  if (!accessible) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const existing = accessible.row;

  if (IN_FLIGHT_STATUSES.has(existing.status)) {
    res.status(409).json({ error: "This project is mid-run and can't be edited right now" });
    return;
  }

  const editedContractCode =
    parsed.data.smartContractCode !== undefined &&
    parsed.data.smartContractCode !== existing.smartContractCode;

  const [updated] = await db
    .update(contractProjectsTable)
    .set({
      ...(parsed.data.smartContractCode !== undefined ? { smartContractCode: parsed.data.smartContractCode } : {}),
      ...(parsed.data.testSuiteCode !== undefined ? { testSuiteCode: parsed.data.testSuiteCode } : {}),
      // A manual edit to the contract source invalidates every analysis that
      // was computed against the old code — stale scores/notes/bytecode would
      // otherwise be shown (and deployable) alongside code that was never
      // actually audited or compiled.
      ...(editedContractCode
        ? {
            securityScore: null,
            securityNotes: null,
            securityContextQuestion: null,
            gasNotes: null,
            gasEstimates: null,
            compiledBytecode: null,
            compileLog: null,
            verificationStatus: null,
            verificationUrl: null,
            verificationError: null,
          }
        : {}),
    })
    .where(eq(contractProjectsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(UpdateProjectCodeResponse.parse(updated));
});

router.patch("/projects/:id/monitoring", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateMonitoringConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid monitoring config payload" });
    return;
  }

  const accessible = await loadAccessibleProject(req.session.userId!, id);
  if (!accessible) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const existing = accessible.row;

  if (parsed.data.enabled) {
    if (existing.ecosystem !== "EVM") {
      res.status(400).json({ error: "Monitoring is currently EVM-only" });
      return;
    }
    if (!existing.liveDeployedAddress) {
      res.status(400).json({ error: "Deploy the contract before enabling monitoring" });
      return;
    }
    if (!parsed.data.webhookUrl && !parsed.data.emailAlertsEnabled) {
      res.status(400).json({ error: "Provide a webhook URL or enable email alerts" });
      return;
    }
  }

  const [updated] = await db
    .update(contractProjectsTable)
    .set({
      monitoringEnabled: parsed.data.enabled,
      monitoringWebhookUrl: parsed.data.enabled ? (parsed.data.webhookUrl ?? null) : null,
      monitoringEmailAlertsEnabled: parsed.data.enabled ? (parsed.data.emailAlertsEnabled ?? false) : false,
      // Reset the scan cursor whenever monitoring is (re)enabled so it starts
      // from a fresh bounded lookback window rather than a stale block.
      ...(parsed.data.enabled ? { monitoringLastCheckedBlock: null } : {}),
    })
    .where(eq(contractProjectsTable.id, id))
    .returning();

  res.json(UpdateMonitoringConfigResponse.parse(updated));
});

router.post("/projects/:id/harden", async (req, res) => {
  const id = Number(req.params.id);
  const accessible = await loadAccessibleProject(req.session.userId!, id);

  if (!accessible) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const parent = accessible.row;

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
      teamId: parent.teamId,
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
  const accessible = await loadAccessibleProject(req.session.userId!, id);

  if (!accessible || accessible.row.parentProjectId === null) {
    res.status(404).json({ error: "Hardening job not found" });
    return;
  }
  const child = accessible.row;

  const [parent] = await db
    .select()
    .from(contractProjectsTable)
    .where(eq(contractProjectsTable.id, child.parentProjectId!))
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
