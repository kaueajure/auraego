import { rankForAura } from "@aura-ego/shared";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "./security.js";
import { getUserProfile, listRankings, listUserMatches, updateProfile } from "./repositories/user-repository.js";

function asCosmeticsMap(value: unknown): Record<string, string> {
  let source = value;
  if (typeof source === "string") {
    try { source = JSON.parse(source); } catch { return {}; }
  }
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(source as Record<string, unknown>)) {
    if (typeof entry === "string") out[key] = entry;
  }
  return out;
}

function publicProfile(user: NonNullable<Awaited<ReturnType<typeof getUserProfile>>>) {
  const { profile } = user;
  if (!profile) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt),
    profile: {
      level: profile.level,
      experience: profile.experience,
      totalAura: profile.totalAura,
      mmr: profile.mmr,
      rank: rankForAura(profile.totalAura),
      wins: profile.wins,
      losses: profile.losses,
      winStreak: profile.winStreak,
      tutorialCompleted: profile.tutorialCompleted,
      selectedCosmetics: asCosmeticsMap(profile.selectedCosmetics)
    }
  };
}

export const usersRouter = Router();
usersRouter.use(requireAuth);
usersRouter.get("/me", async (req: AuthedRequest, res) => {
  const user = await getUserProfile(req.auth!.sub);
  const body = user ? publicProfile(user) : null;
  if (!body) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Perfil não encontrado." } });
  res.json(body);
});
usersRouter.patch("/me", async (req: AuthedRequest, res) => {
  const data = z.object({
    tutorialCompleted: z.boolean().optional(),
    selectedCosmetics: z.record(z.string(), z.string()).optional(),
    audioSettings: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    graphicsSettings: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional()
  }).strict().parse(req.body);
  await updateProfile(req.auth!.sub, data);
  const user = await getUserProfile(req.auth!.sub);
  const body = user ? publicProfile(user) : null;
  if (!body) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Perfil não encontrado." } });
  res.json(body);
});
usersRouter.get("/me/matches", async (req: AuthedRequest, res) => {
  res.json(await listUserMatches(req.auth!.sub));
});
usersRouter.get("/rankings", async (_req, res) => {
  res.json(await listRankings());
});
