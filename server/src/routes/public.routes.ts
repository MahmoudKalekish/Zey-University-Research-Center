import { Router } from "express";
import * as c from "../controllers/public.controller.js";
import { asyncHandler } from "../utils/http.js";
import { prisma } from "../config/db.js";
import { contactSchema } from "../validation/schemas.js";
import { globalSearch } from "../services/search.service.js";
import { askResearchAssistant } from "../services/ai.service.js";
import { chatSchema } from "../validation/schemas.js";
export const publicRouter = Router();
publicRouter.get("/home", asyncHandler(c.home));
publicRouter.get("/areas", asyncHandler(c.areas));
publicRouter.get("/researchers", asyncHandler(c.researchers));
publicRouter.get("/researchers/:slug", asyncHandler(c.researcher));
publicRouter.get("/projects", asyncHandler(c.projects));
publicRouter.get("/projects/:slug", asyncHandler(c.project));
publicRouter.get("/publications", asyncHandler(c.publications));
publicRouter.get("/publications/:slug", asyncHandler(c.publication));
publicRouter.get("/content/:kind", asyncHandler(c.content));
publicRouter.get(
  "/search",
  asyncHandler(async (req: any, res: any) =>
    res.json(await globalSearch(String(req.query.q || ""), 10)),
  ),
);
publicRouter.post(
  "/contact",
  asyncHandler(async (req: any, res: any) => {
    const data = contactSchema.parse(req.body);
    res.status(201).json(await prisma.contactMessage.create({ data }));
  }),
);
publicRouter.post(
  "/ai/ask",
  asyncHandler(async (req: any, res: any) => {
    const data = chatSchema.parse(req.body);
    res.json(
      await askResearchAssistant(data.question, data.sessionId, req.user?.id),
    );
  }),
);
