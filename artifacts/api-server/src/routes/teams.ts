import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  usersTable,
  teamsTable,
  teamMembershipsTable,
  teamInvitesTable,
} from "@workspace/db";
import {
  CreateTeamBody,
  CreateTeamResponse,
  ListTeamsResponse,
  ListTeamMembersResponse,
  CreateTeamInviteBody,
  CreateTeamInviteResponse,
  ListMyInvitesResponse,
  AcceptTeamInviteResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { getTeamRole } from "../lib/teams/access";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/teams", async (req, res) => {
  const rows = await db
    .select({
      id: teamsTable.id,
      name: teamsTable.name,
      role: teamMembershipsTable.role,
      createdAt: teamMembershipsTable.createdAt,
    })
    .from(teamMembershipsTable)
    .innerJoin(teamsTable, eq(teamMembershipsTable.teamId, teamsTable.id))
    .where(eq(teamMembershipsTable.userId, req.session.userId!));

  res.json(ListTeamsResponse.parse(rows));
});

router.post("/teams", async (req, res) => {
  const parsed = CreateTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Team name is required" });
    return;
  }

  const [team] = await db
    .insert(teamsTable)
    .values({ name: parsed.data.name, ownerId: req.session.userId! })
    .returning();

  if (!team) {
    res.status(500).json({ error: "Failed to create team" });
    return;
  }

  const [membership] = await db
    .insert(teamMembershipsTable)
    .values({ teamId: team.id, userId: req.session.userId!, role: "owner" })
    .returning();

  res.status(201).json(
    CreateTeamResponse.parse({
      id: team.id,
      name: team.name,
      role: membership!.role,
      createdAt: membership!.createdAt,
    }),
  );
});

router.get("/teams/:id/members", async (req, res) => {
  const teamId = Number(req.params.id);
  const role = await getTeamRole(req.session.userId!, teamId);
  if (!role) {
    res.status(403).json({ error: "You are not a member of this team" });
    return;
  }

  const rows = await db
    .select({
      userId: usersTable.id,
      email: usersTable.email,
      role: teamMembershipsTable.role,
    })
    .from(teamMembershipsTable)
    .innerJoin(usersTable, eq(teamMembershipsTable.userId, usersTable.id))
    .where(eq(teamMembershipsTable.teamId, teamId));

  res.json(ListTeamMembersResponse.parse(rows));
});

router.delete("/teams/:id/members/:userId", async (req, res) => {
  const teamId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);
  const role = await getTeamRole(req.session.userId!, teamId);
  if (role !== "owner") {
    res.status(403).json({ error: "Only the team owner can remove members" });
    return;
  }
  if (targetUserId === req.session.userId) {
    res.status(400).json({ error: "The owner cannot remove themselves" });
    return;
  }

  await db
    .delete(teamMembershipsTable)
    .where(
      and(
        eq(teamMembershipsTable.teamId, teamId),
        eq(teamMembershipsTable.userId, targetUserId),
      ),
    );

  res.status(204).end();
});

router.post("/teams/:id/invites", async (req, res) => {
  const teamId = Number(req.params.id);
  const role = await getTeamRole(req.session.userId!, teamId);
  if (role !== "owner") {
    res.status(403).json({ error: "Only the team owner can invite members" });
    return;
  }

  const parsed = CreateTeamInviteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }

  const [team] = await db
    .select({ name: teamsTable.name })
    .from(teamsTable)
    .where(eq(teamsTable.id, teamId))
    .limit(1);

  const [invite] = await db
    .insert(teamInvitesTable)
    .values({
      teamId,
      email: parsed.data.email,
      role: parsed.data.role ?? "member",
      status: "pending",
      invitedByUserId: req.session.userId!,
    })
    .returning();

  if (!invite) {
    res.status(500).json({ error: "Failed to create invite" });
    return;
  }

  res.status(201).json(
    CreateTeamInviteResponse.parse({
      id: invite.id,
      teamId: invite.teamId,
      teamName: team?.name ?? "Unknown team",
      email: invite.email,
      role: invite.role,
      status: invite.status,
      createdAt: invite.createdAt,
    }),
  );
});

router.get("/invites", async (req, res) => {
  const [user] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!))
    .limit(1);

  if (!user) {
    res.json([]);
    return;
  }

  const rows = await db
    .select({
      id: teamInvitesTable.id,
      teamId: teamInvitesTable.teamId,
      teamName: teamsTable.name,
      email: teamInvitesTable.email,
      role: teamInvitesTable.role,
      status: teamInvitesTable.status,
      createdAt: teamInvitesTable.createdAt,
    })
    .from(teamInvitesTable)
    .innerJoin(teamsTable, eq(teamInvitesTable.teamId, teamsTable.id))
    .where(
      and(
        eq(teamInvitesTable.email, user.email),
        eq(teamInvitesTable.status, "pending"),
      ),
    );

  res.json(ListMyInvitesResponse.parse(rows));
});

router.post("/invites/:id/accept", async (req, res) => {
  const inviteId = Number(req.params.id);
  const [user] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!))
    .limit(1);

  const [invite] = await db
    .select()
    .from(teamInvitesTable)
    .where(
      and(
        eq(teamInvitesTable.id, inviteId),
        eq(teamInvitesTable.status, "pending"),
      ),
    )
    .limit(1);

  if (!invite || !user || invite.email !== user.email) {
    res.status(404).json({ error: "Invite not found" });
    return;
  }

  await db
    .insert(teamMembershipsTable)
    .values({ teamId: invite.teamId, userId: req.session.userId!, role: invite.role })
    .onConflictDoNothing();

  await db
    .update(teamInvitesTable)
    .set({ status: "accepted" })
    .where(eq(teamInvitesTable.id, inviteId));

  const [team] = await db
    .select({ name: teamsTable.name })
    .from(teamsTable)
    .where(eq(teamsTable.id, invite.teamId))
    .limit(1);

  res.json(
    AcceptTeamInviteResponse.parse({
      id: invite.teamId,
      name: team?.name ?? "Unknown team",
      role: invite.role,
      createdAt: invite.createdAt,
    }),
  );
});

router.post("/invites/:id/decline", async (req, res) => {
  const inviteId = Number(req.params.id);
  const [user] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!))
    .limit(1);

  const [invite] = await db
    .select()
    .from(teamInvitesTable)
    .where(
      and(
        eq(teamInvitesTable.id, inviteId),
        eq(teamInvitesTable.status, "pending"),
      ),
    )
    .limit(1);

  if (!invite || !user || invite.email !== user.email) {
    res.status(404).json({ error: "Invite not found" });
    return;
  }

  await db
    .update(teamInvitesTable)
    .set({ status: "declined" })
    .where(eq(teamInvitesTable.id, inviteId));

  res.status(204).end();
});

export default router;
