import type { Request, Response, NextFunction } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { db, apiKeysTable } from "@workspace/db";
import { hashApiKey, looksLikeApiKey } from "../lib/apiKeys/crypto";

/** Extracts a bearer/API-key token from Authorization or X-Api-Key headers. */
function extractApiKey(req: Request): string | null {
  const authHeader = req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (looksLikeApiKey(token)) return token;
  }
  const apiKeyHeader = req.header("x-api-key");
  if (apiKeyHeader && looksLikeApiKey(apiKeyHeader)) return apiKeyHeader;
  return null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session.userId) {
    next();
    return;
  }

  const token = extractApiKey(req);
  if (token) {
    const [key] = await db
      .select({ id: apiKeysTable.id, userId: apiKeysTable.userId })
      .from(apiKeysTable)
      .where(
        and(
          eq(apiKeysTable.keyHash, hashApiKey(token)),
          isNull(apiKeysTable.revokedAt),
        ),
      )
      .limit(1);

    if (key) {
      // Session-based auth already scopes requests via req.session.userId
      // everywhere downstream; setting it here lets API-key requests reuse
      // every existing route handler unchanged.
      req.session.userId = key.userId;
      void db
        .update(apiKeysTable)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeysTable.id, key.id));
      next();
      return;
    }

    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  res.status(401).json({ error: "Not authenticated" });
}
