/**
 * Integration tests: duplicate CLI key prevention for login and signup.
 *
 * Login test mirrors the three-step sequence the CLI performs in login.ts:
 *   1. POST /api/auth/login  → obtain session cookie
 *   2. GET  /api/api-keys    → find & DELETE any active "CLI" keys
 *   3. POST /api/api-keys    → create one fresh "CLI" key
 *
 * Signup test mirrors the four-step sequence the CLI performs in login.ts
 * (runSignup):
 *   1. POST /api/auth/signup → obtain session cookie (first run only)
 *   2. GET  /api/api-keys    → find & DELETE any active "CLI" keys
 *   3. POST /api/api-keys    → create one fresh "CLI" key
 *
 * Both sequences are run twice to assert only a single active (non-revoked)
 * key labelled "CLI" remains for the test user.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { db, usersTable, apiKeysTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import app from "../app.js";

// ─── Test fixtures ────────────────────────────────────────────────────────────

const TEST_EMAIL = `test-double-login-${Date.now()}@example.com`;
const SIGNUP_TEST_EMAIL = `test-double-signup-${Date.now()}@example.com`;
const TEST_PASSWORD = "TestPass123!";

async function createTestUser() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 1); // cost=1 for speed
  const [user] = await db
    .insert(usersTable)
    .values({ email: TEST_EMAIL, passwordHash })
    .returning();
  return user!;
}

async function cleanupTestUser(userId: number) {
  // Cascade delete will remove api_keys rows via FK, but we do it explicitly
  // to be clear about intent.
  await db.delete(apiKeysTable).where(eq(apiKeysTable.userId, userId));
  await db.delete(usersTable).where(eq(usersTable.id, userId));
}

// ─── Helpers that replicate what the CLI does ─────────────────────────────────

type ApiKeyRow = { id: number; label: string; revokedAt: string | null };

/**
 * Perform one full "CLI login" sequence via HTTP:
 *   login → list keys → revoke active CLI keys → create new CLI key
 *
 * Returns the session cookie so callers can make follow-up requests if needed.
 */
async function performCliLogin(
  agent: ReturnType<typeof request.agent>,
): Promise<string> {
  // Step 1 – authenticate
  const loginRes = await agent
    .post("/api/auth/login")
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

  expect(loginRes.status).toBe(200);

  // Step 2 – revoke any existing active CLI keys
  const listRes = await agent.get("/api/api-keys");
  expect(listRes.status).toBe(200);

  const existing: ApiKeyRow[] = listRes.body;
  const activeCliKeys = existing.filter(
    (k) => k.label === "CLI" && !k.revokedAt,
  );
  for (const key of activeCliKeys) {
    const delRes = await agent.delete(`/api/api-keys/${key.id}`);
    expect(delRes.status).toBe(204);
  }

  // Step 3 – create a fresh CLI key
  const createRes = await agent
    .post("/api/api-keys")
    .send({ label: "CLI" });
  expect(createRes.status).toBe(201);

  return ""; // agent handles cookie jar automatically
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CLI login flow — duplicate key prevention", () => {
  let userId: number;

  beforeAll(async () => {
    const user = await createTestUser();
    userId = user.id;
  });

  afterAll(async () => {
    await cleanupTestUser(userId);
  });

  it(
    "leaves exactly one active CLI key after logging in twice",
    async () => {
      // supertest agent maintains the session cookie across requests
      const agent = request.agent(app);

      // First login — no pre-existing keys, creates one
      await performCliLogin(agent);

      // Second login — should revoke the first key, then create a fresh one
      await performCliLogin(agent);

      // Verify via the DB directly so we're not relying on the list endpoint
      // to filter the result for us.
      const allKeys = await db
        .select()
        .from(apiKeysTable)
        .where(eq(apiKeysTable.userId, userId));

      const activeCliKeys = allKeys.filter(
        (k) => k.label === "CLI" && k.revokedAt === null,
      );

      expect(
        activeCliKeys,
        "Expected exactly one active CLI key after two logins",
      ).toHaveLength(1);

      // Sanity-check: the revoked key from the first login is also present
      const revokedCliKeys = allKeys.filter(
        (k) => k.label === "CLI" && k.revokedAt !== null,
      );
      expect(
        revokedCliKeys,
        "Expected the first login's key to be revoked",
      ).toHaveLength(1);
    },
  );

  it("does not touch keys with other labels", async () => {
    const agent = request.agent(app);

    // Login first so we have a session
    const loginRes = await agent
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(loginRes.status).toBe(200);

    // Create a non-CLI key manually
    const otherKeyRes = await agent
      .post("/api/api-keys")
      .send({ label: "Production" });
    expect(otherKeyRes.status).toBe(201);
    const otherKeyId: number = otherKeyRes.body.id;

    // Perform a full CLI login — should only revoke "CLI"-labelled keys
    await performCliLogin(agent);

    // The "Production" key must still be active
    const allKeys = await db
      .select()
      .from(apiKeysTable)
      .where(
        and(
          eq(apiKeysTable.userId, userId),
          eq(apiKeysTable.id, otherKeyId),
        ),
      );

    expect(allKeys).toHaveLength(1);
    expect(allKeys[0]!.revokedAt).toBeNull();
  });
});

// ─── Helpers for signup flow ──────────────────────────────────────────────────

/**
 * Perform one full "CLI signup" key-creation sequence via HTTP for an already-
 * authenticated session.  This mirrors what runSignup does after account
 * creation:
 *   1. GET  /api/api-keys    → find & DELETE any active "CLI" keys
 *   2. POST /api/api-keys    → create one fresh "CLI" key
 *
 * The caller is responsible for establishing the session on the agent before
 * invoking this (e.g. via POST /api/auth/login or POST /api/auth/signup).
 */
async function performSignupCliKeyCreation(
  agent: ReturnType<typeof request.agent>,
): Promise<void> {
  // Step 1 – revoke any existing active CLI keys (matches runSignup behaviour)
  const listRes = await agent.get("/api/api-keys");
  expect(listRes.status).toBe(200);

  const existing: ApiKeyRow[] = listRes.body;
  const activeCliKeys = existing.filter(
    (k) => k.label === "CLI" && !k.revokedAt,
  );
  for (const key of activeCliKeys) {
    const delRes = await agent.delete(`/api/api-keys/${key.id}`);
    expect(delRes.status).toBe(204);
  }

  // Step 2 – create a fresh CLI key
  const createRes = await agent
    .post("/api/api-keys")
    .send({ label: "CLI" });
  expect(createRes.status).toBe(201);
}

// ─── Signup flow tests ────────────────────────────────────────────────────────

describe("CLI signup flow — duplicate key prevention", () => {
  let signupUserId: number;

  beforeAll(async () => {
    // Pre-create the user so we can log in without hitting the signup endpoint
    // (which can only be called once per email). This lets us simulate the
    // scenario where the session is reused and the key-creation step is retried.
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 1);
    const [user] = await db
      .insert(usersTable)
      .values({ email: SIGNUP_TEST_EMAIL, passwordHash })
      .returning();
    signupUserId = user!.id;
  });

  afterAll(async () => {
    await db.delete(apiKeysTable).where(eq(apiKeysTable.userId, signupUserId));
    await db.delete(usersTable).where(eq(usersTable.id, signupUserId));
  });

  it(
    "leaves exactly one active CLI key when the key-creation step is retried on the same session",
    async () => {
      const agent = request.agent(app);

      // Establish a session (mirrors what POST /api/auth/signup would do)
      const loginRes = await agent
        .post("/api/auth/login")
        .send({ email: SIGNUP_TEST_EMAIL, password: TEST_PASSWORD });
      expect(loginRes.status).toBe(200);

      // First key-creation attempt (e.g. normal signup completing successfully)
      await performSignupCliKeyCreation(agent);

      // Second key-creation attempt on the same session (e.g. CLI retry after
      // a transient network error on the first attempt).
      // With the revoke-then-create fix this must leave only one active key.
      await performSignupCliKeyCreation(agent);

      // Assert via the DB directly
      const allKeys = await db
        .select()
        .from(apiKeysTable)
        .where(eq(apiKeysTable.userId, signupUserId));

      const activeCliKeys = allKeys.filter(
        (k) => k.label === "CLI" && k.revokedAt === null,
      );

      expect(
        activeCliKeys,
        "Expected exactly one active CLI key after two key-creation attempts",
      ).toHaveLength(1);

      // The first key must have been revoked by the second attempt
      const revokedCliKeys = allKeys.filter(
        (k) => k.label === "CLI" && k.revokedAt !== null,
      );
      expect(
        revokedCliKeys,
        "Expected the first CLI key to be revoked by the retry",
      ).toHaveLength(1);
    },
  );

  it("does not revoke non-CLI keys during signup key creation", async () => {
    const agent = request.agent(app);

    // Establish a session
    const loginRes = await agent
      .post("/api/auth/login")
      .send({ email: SIGNUP_TEST_EMAIL, password: TEST_PASSWORD });
    expect(loginRes.status).toBe(200);

    // Create a non-CLI key that should survive
    const otherKeyRes = await agent
      .post("/api/api-keys")
      .send({ label: "Production" });
    expect(otherKeyRes.status).toBe(201);
    const otherKeyId: number = otherKeyRes.body.id;

    // Perform the signup key-creation sequence
    await performSignupCliKeyCreation(agent);

    // The "Production" key must still be active
    const allKeys = await db
      .select()
      .from(apiKeysTable)
      .where(
        and(
          eq(apiKeysTable.userId, signupUserId),
          eq(apiKeysTable.id, otherKeyId),
        ),
      );

    expect(allKeys).toHaveLength(1);
    expect(allKeys[0]!.revokedAt).toBeNull();
  });
});
