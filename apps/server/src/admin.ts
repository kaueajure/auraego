import { isAdminEmail } from "@aura-ego/shared";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "./security.js";
import { findUserById } from "./repositories/auth-repository.js";
import { listActivityLogs } from "./repositories/activity-repository.js";

export const adminRouter = Router();
adminRouter.use(requireAuth);

adminRouter.get("/logs", async (req: AuthedRequest, res) => {
  const user = await findUserById(req.auth!.sub);
  if (!user || !isAdminEmail(user.email)) {
    return res.status(403).json({ error: { code: "FORBIDDEN", message: "Acesso restrito à administração." } });
  }
  const query = z.object({
    limit: z.coerce.number().int().min(1).max(500).optional()
  }).parse(req.query);
  res.json(await listActivityLogs(query.limit ?? 200));
});
