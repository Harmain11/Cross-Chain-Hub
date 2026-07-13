import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const contractProjectsTable = pgTable("contract_projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  contractName: text("contract_name").notNull(),
  ecosystem: text("ecosystem").notNull(), // "EVM" | "SOLANA"
  parentProjectId: integer("parent_project_id"), // set when this row is a manual "Improve Security" re-run of another project
  status: text("status").notNull().default("pending"), // pending|generating|compiling|healing|hardening|success|failed
  smartContractCode: text("smart_contract_code"),
  compiledBytecode: text("compiled_bytecode"),
  abiOrIdl: text("abi_or_idl"), // JSON-serialized string
  securityScore: integer("security_score"),
  securityNotes: text("security_notes"),
  // Set when the auditor determines a specific piece of business/context info
  // (e.g. intended access-control model) would let it improve the score further.
  // Cleared once a hardening run addresses it or reaches the target score.
  securityContextQuestion: text("security_context_question"),
  // Free-text answer the user supplied to securityContextQuestion, used to
  // seed the next hardening pass with that extra context.
  userContext: text("user_context"),
  compileLog: text("compile_log"),
  networkSelected: text("network_selected"),
  deploymentTxHash: text("deployment_tx_hash"),
  liveDeployedAddress: text("live_deployed_address"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertContractProjectSchema = createInsertSchema(
  contractProjectsTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertContractProject = z.infer<
  typeof insertContractProjectSchema
>;
export type ContractProjectRow = typeof contractProjectsTable.$inferSelect;
