import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const teamsTable = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teamMembershipsTable = pgTable(
  "team_memberships",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id")
      .notNull()
      .references(() => teamsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // "owner" | "member"
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.teamId, table.userId)],
);

export const teamInvitesTable = pgTable("team_invites", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teamsTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"), // "owner" | "member"
  status: text("status").notNull().default("pending"), // "pending" | "accepted" | "declined"
  invitedByUserId: integer("invited_by_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertTeamSchema = createInsertSchema(teamsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teamsTable.$inferSelect;

export const insertTeamMembershipSchema = createInsertSchema(
  teamMembershipsTable,
).omit({ id: true, createdAt: true });
export type InsertTeamMembership = z.infer<typeof insertTeamMembershipSchema>;
export type TeamMembership = typeof teamMembershipsTable.$inferSelect;

export const insertTeamInviteSchema = createInsertSchema(teamInvitesTable).omit(
  { id: true, createdAt: true },
);
export type InsertTeamInvite = z.infer<typeof insertTeamInviteSchema>;
export type TeamInvite = typeof teamInvitesTable.$inferSelect;
