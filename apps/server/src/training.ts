import { Router } from "express";
import { prisma } from "./db.js";
import { requireAuth, type AuthedRequest } from "./security.js";
import { z } from "zod";

export const trainingRouter = Router();
trainingRouter.use(requireAuth);
trainingRouter.post("/start", async (req: AuthedRequest, res) => {
  const data = z.object({ difficulty: z.enum(["INICIANTE", "NORMAL", "DIFICIL", "INSANO"]) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } });
  if (!user?.emailVerifiedAt) return res.status(403).json({ error: { code: "EMAIL_NOT_VERIFIED", message: "Verifique seu e-mail para iniciar o treino." } });
  res.status(201).json({ transport: "websocket", event: "training:start", difficulty: data.difficulty });
});
