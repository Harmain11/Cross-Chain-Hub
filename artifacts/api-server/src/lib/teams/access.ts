import { and, eq } from "drizzle-orm";
import { db, teamMembershipsTable } from "@workspace/db";

export type TeamRole = "owner" | "member";

/** Returns the caller's role on a team, or null if they aren't a member. */
export async function getTeamRole(
  userId: number,
  teamId: number,
): Promise<TeamRole | null> {
  const [membership] = await db
    .select({ role: teamMembershipsTable.role })
    .from(teamMembershipsTable)
    .where(
      and(
        eq(teamMembershipsTable.teamId, teamId),
        eq(teamMembershipsTable.userId, userId),
      ),
    )
    .limit(1);

  return (membership?.role as TeamRole | undefined) ?? null;
}
