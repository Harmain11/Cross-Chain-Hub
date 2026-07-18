import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  SignupBody,
  LoginBody,
  SignupResponse,
  LoginResponse,
  GetCurrentUserResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/signup", async (req, res) => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email or password (min 8 chars)" });
    return;
  }
  const { email, password } = parsed.data;

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "An account with that email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash })
    .returning();

  if (!user) {
    res.status(500).json({ error: "Failed to create account" });
    return;
  }

  req.session.userId = user.id;
  // Explicitly save before responding so the session row exists in PostgreSQL
  // before the client fires its next request. Without this, the async DB write
  // races with the immediately-following GET /api/auth/me and returns 401.
  await new Promise<void>((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
  res.status(201).json(
    SignupResponse.parse({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    }),
  );
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email or password" });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Incorrect email or password" });
    return;
  }

  req.session.userId = user.id;
  // Explicitly save before responding — same race-condition fix as signup.
  await new Promise<void>((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
  res.json(
    LoginResponse.parse({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    }),
  );
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Failed to log out" });
      return;
    }
    res.clearCookie("connect.sid");
    res.status(204).end();
  });
});

router.get("/auth/me", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  res.json(
    GetCurrentUserResponse.parse({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    }),
  );
});

export default router;
