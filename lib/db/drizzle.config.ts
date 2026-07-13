import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // user_sessions is created/managed by connect-pg-simple at runtime, not by
  // drizzle's schema — exclude it so `drizzle-kit push` never proposes
  // dropping it (it holds live login sessions).
  tablesFilter: ["!user_sessions"],
});
