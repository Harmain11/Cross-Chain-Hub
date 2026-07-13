import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, contractProjectsTable } from "@workspace/db";
import { CreateForgeJobBody, CreateForgeJobResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { runForgePipeline } from "../lib/forge/pipeline";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.use(requireAuth);

router.post("/forge-contract", async (req, res) => {
  const parsed = CreateForgeJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid forge job request" });
    return;
  }

  const [project] = await db
    .insert(contractProjectsTable)
    .values({
      userId: req.session.userId!,
      prompt: parsed.data.prompt,
      contractName: parsed.data.contractName,
      ecosystem: parsed.data.ecosystem,
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
    .where(
      and(
        eq(contractProjectsTable.id, id),
        eq(contractProjectsTable.userId, req.session.userId!),
      ),
    )
    .limit(1);

  if (!project) {
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
