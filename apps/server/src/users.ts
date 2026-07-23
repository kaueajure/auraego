import { Router } from "express";
import { z } from "zod";
import { prisma } from "./db.js";
import { requireAuth, type AuthedRequest } from "./security.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);
usersRouter.get("/me", async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.sub }, include: { profile: true } });
  if (!user?.profile) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Perfil não encontrado." } });
  res.json({ id: user.id, username: user.username, email: user.email, emailVerified: Boolean(user.emailVerifiedAt), profile: { ...user.profile, selectedCosmetics: user.profile.selectedCosmetics, passwordHash: undefined } });
});
usersRouter.patch("/me", async (req: AuthedRequest, res) => {
  const data = z.object({ tutorialCompleted: z.boolean().optional(), selectedCosmetics: z.record(z.string(), z.string()).optional(), audioSettings: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(), graphicsSettings: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional() }).strict().parse(req.body);
  const profile = await prisma.playerProfile.update({ where: { userId: req.auth!.sub }, data });
  res.json(profile);
});
usersRouter.get("/me/matches", async (req: AuthedRequest, res) => {
  const matches = await prisma.matchParticipant.findMany({ where: { userId: req.auth!.sub }, include: { match: true }, orderBy: { match: { endedAt: "desc" } }, take: 20 });
  res.json(matches.map(p => ({ id: p.matchId, mode: p.match.mode, status: p.match.status, startedAt: p.match.startedAt, endedAt: p.match.endedAt, result: p.result, aura: p.aura, highestCombo: p.highestCombo, accuracy: p.accuracy })));
});
usersRouter.get("/rankings", async (_req, res) => {
  const profiles = await prisma.playerProfile.findMany({ take: 100, orderBy: [{ mmr: "desc" }, { wins: "desc" }], include: { user: { select: { username: true } } } });
  res.json(profiles.map((p, index) => ({ position: index + 1, username: p.user.username, mmr: p.mmr, rank: p.currentRank, wins: p.wins, losses: p.losses, totalAura: p.totalAura })));
});
