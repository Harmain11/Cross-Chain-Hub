import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";

if (!process.env.SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET must be set. Did you forget to provision it?",
  );
}

const PgSession = connectPgSimple(session);

export const sessionMiddleware = session({
  store: new PgSession({
    pool,
    tableName: "user_sessions",
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  },
});

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}
