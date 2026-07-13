import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, apiKeysTable } from "@workspace/db";
import {
  CreateApiKeyBody,
  CreateApiKeyResponse,
  ListApiKeysResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { generateApiKey } from "../lib/apiKeys/crypto";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/api-keys", async (req, res) => {
  const rows = await db
    .select({
      id: apiKeysTable.id,
      label: apiKeysTable.label,
      keyPrefix: apiKeysTable.keyPrefix,
      createdAt: apiKeysTable.createdAt,
      lastUsedAt: apiKeysTable.lastUsedAt,
      revokedAt: apiKeysTable.revokedAt,
    })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.userId, req.session.userId!))
    .orderBy(apiKeysTable.createdAt);

  res.json(ListApiKeysResponse.parse(rows));
});

router.post("/api-keys", async (req, res) => {
  const parsed = CreateApiKeyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A label is required" });
    return;
  }

  const { fullKey, keyHash, keyPrefix } = generateApiKey();

  const [key] = await db
    .insert(apiKeysTable)
    .values({
      userId: req.session.userId!,
      label: parsed.data.label,
      keyHash,
      keyPrefix,
    })
    .returning();

  if (!key) {
    res.status(500).json({ error: "Failed to create API key" });
    return;
  }

  res.status(201).json(
    CreateApiKeyResponse.parse({
      id: key.id,
      label: key.label,
      keyPrefix: key.keyPrefix,
      fullKey,
      createdAt: key.createdAt,
    }),
  );
});

router.delete("/api-keys/:id", async (req, res) => {
  const id = Number(req.params.id);

  const [revoked] = await db
    .update(apiKeysTable)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(apiKeysTable.id, id),
        eq(apiKeysTable.userId, req.session.userId!),
      ),
    )
    .returning();

  if (!revoked) {
    res.status(404).json({ error: "API key not found" });
    return;
  }

  res.status(204).end();
});

export default router;
