import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, contractProjectsTable } from "@workspace/db";
import { CreateForgeJobBody, CreateForgeJobResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { runForgePipeline } from "../lib/forge/pipeline";
import { getTeamRole } from "../lib/teams/access";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.use(requireAuth);

router.post("/forge-contract", async (req, res) => {
  const parsed = CreateForgeJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid forge job request" });
    return;
  }

  if (parsed.data.teamId != null) {
    const role = await getTeamRole(req.session.userId!, parsed.data.teamId);
    if (!role) {
      res.status(403).json({ error: "You are not a member of this team" });
      return;
    }
  }

  const [project] = await db
    .insert(contractProjectsTable)
    .values({
      userId: req.session.userId!,
      teamId: parsed.data.teamId ?? null,
      prompt: parsed.data.prompt,
      contractName: parsed.data.contractName,
      ecosystem: parsed.data.ecosystem,
      templateId: parsed.data.templateId ?? null,
      upgradeable: parsed.data.upgradeable ?? false,
      status: "pending",
    })
    .returning();

  if (!project) {
    res.status(500).json({ error: "Failed to create forge job" });
    return;
  }

  res.status(201).json(CreateForgeJobResponse.parse(project));
});

router.get("/forge-contract/:id/stream", async (req, res) => {
  const id = Number(req.params.id);
  const [project] = await db
    .select()
    .from(contractProjectsTable)
    .where(eq(contractProjectsTable.id, id))
    .limit(1);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const isOwner = project.userId === req.session.userId;
  const isTeammate =
    project.teamId != null &&
    (await getTeamRole(req.session.userId!, project.teamId)) !== null;
  if (!isOwner && !isTeammate) {
    res.status(404).json({ error: "Project not found" });
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
    await runForgePipeline(project, send);
  } catch (err) {
    logger.error({ err }, "Forge pipeline crashed");
    send({ phase: "error", message: "Forge job crashed unexpectedly." });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});

export default router;
