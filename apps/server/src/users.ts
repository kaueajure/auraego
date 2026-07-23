import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "./security.js";
import { getUserProfile, listRankings, listUserMatches, updateProfile } from "./repositories/user-repository.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);
usersRouter.get("/me", async (req: AuthedRequest, res) => {
  const user = await getUserProfile(req.auth!.sub);
  if (!user?.profile) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Perfil não encontrado." } });
  res.json({ id: user.id, username: user.username, email: user.email, emailVerified: Boolean(user.emailVerifiedAt), profile: user.profile });
});
usersRouter.patch("/me", async (req: AuthedRequest, res) => {
  const data = z.object({ tutorialCompleted: z.boolean().optional(), selectedCosmetics: z.record(z.string(), z.string()).optional(), audioSettings: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(), graphicsSettings: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional() }).strict().parse(req.body);
  const profile = await updateProfile(req.auth!.sub, data);
  res.json(profile);
});
usersRouter.get("/me/matches", async (req: AuthedRequest, res) => {
  res.json(await listUserMatches(req.auth!.sub));
});
usersRouter.get("/rankings", async (_req, res) => {
  res.json(await listRankings());
});
