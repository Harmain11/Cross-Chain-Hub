import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { teamsTable } from "./teams";

export const contractProjectsTable = pgTable("contract_projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  // Set when this project was created under a team workspace instead of the
  // creator's personal account. Null means it's a personal project.
  teamId: integer("team_id").references(() => teamsTable.id, {
    onDelete: "cascade",
  }),
  prompt: text("prompt").notNull(),
  contractName: text("contract_name").notNull(),
  ecosystem: text("ecosystem").notNull(), // "EVM" | "SOLANA"
  // Built-in starter template id (see lib/forge/templates.ts), or null for a blank prompt.
  templateId: text("template_id"),
  // Whether generation should use an upgradeable (proxy/UUPS) pattern. EVM only.
  upgradeable: boolean("upgradeable").notNull().default(false),
  // Auto-generated test suite source matching the latest contract version, or null
  // if generation hasn't run yet or failed (failure never blocks the main pipeline).
  testSuiteCode: text("test_suite_code"),
  // Per-function gas estimates from solc (EVM), JSON-serialized array of {functionSignature, gas}. Null for Solana.
  gasEstimates: text("gas_estimates"),
  // LLM-authored gas/efficiency notes (EVM: grounded in gasEstimates; Solana: labeled estimate).
  gasNotes: text("gas_notes"),
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
  // Source verification against the deployed network's explorer/registry (EVM only).
  // null until a deploy triggers verification; "pending"|"verified"|"failed" after.
  verificationStatus: text("verification_status"),
  // Link to the verified-source page once verification succeeds.
  verificationUrl: text("verification_url"),
  // Human-readable reason when verification fails; cleared on success.
  verificationError: text("verification_error"),
  // Post-deploy monitoring (EVM only). When enabled, a background poller
  // checks the deployed contract for new activity since the last-checked
  // block and fires alerts.
  monitoringEnabled: boolean("monitoring_enabled").notNull().default(false),
  monitoringWebhookUrl: text("monitoring_webhook_url"),
  monitoringEmailAlertsEnabled: boolean("monitoring_email_alerts_enabled")
    .notNull()
    .default(false),
  // Last block number (as a string; can exceed JS safe-integer precision) the
  // poller has scanned up to for this contract.
  monitoringLastCheckedBlock: text("monitoring_last_checked_block"),
  monitoringLastCheckedAt: timestamp("monitoring_last_checked_at", {
    withTimezone: true,
  }),
  monitoringLastAlertAt: timestamp("monitoring_last_alert_at", {
    withTimezone: true,
  }),
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
