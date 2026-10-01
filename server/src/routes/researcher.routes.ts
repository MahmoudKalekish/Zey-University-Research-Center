import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../utils/http.js";
import { prisma } from "../config/db.js";
import { researcherSchema } from "../validation/schemas.js";
import { z } from "zod";
import { assertResearcherCanEdit } from "../domain/publication-workflow.js";
import { slugify } from "../utils/http.js";

import { requirePublicationManager } from "../services/publication-access.service.js";
export const researcherRouter = Router();
researcherRouter.use(authenticate, authorize("RESEARCHER", "ADMIN"));

researcherRouter.get(
  "/me",
  asyncHandler(async (req: any, res: any) => {
    const profile = await prisma.researcher.findUnique({
      where: { userId: req.user.id },
      include: {
        areas: { include: { area: true } },
        projects: { include: { project: true } },
        publications: { include: { publication: true } },
      },
    });
    res.json(profile);
  }),
);

researcherRouter.put(
  "/me",
  asyncHandler(async (req: any, res: any) => {
    const current = await prisma.researcher.findUnique({
      where: { userId: req.user.id },
    });
    if (!current) throw new HttpError(404, "Researcher profile not found");
    const { areaIds, ...data } = researcherSchema.partial().parse(req.body);
    const updated = await prisma.$transaction(async (tx) => {
      if (areaIds) {
        await tx.researcherArea.deleteMany({
          where: { researcherId: current.id },
        });
      }
      return tx.researcher.update({
        where: { id: current.id },
        data: {
          ...data,
          ...(areaIds && {
            areas: { create: areaIds.map((areaId) => ({ areaId })) },
          }),
        },
      });
    });
    res.json(updated);
  }),
);

researcherRouter.get(
  "/publications/:id",
  asyncHandler(async (request, response) => {
    await requirePublicationManager(
      String(request.params.id),
      request.user!.id,
    );
    response.json(
      await prisma.publication.findUniqueOrThrow({
        where: { id: String(request.params.id) },
        include: {
          authors: { include: { researcher: true } },
          areas: { include: { area: true } },
        },
      }),
    );
  }),
);

researcherRouter.put(
  "/publications/:id",
  asyncHandler(async (req: any, res: any) => {
    const profile = await prisma.researcher.findUnique({
      where: { userId: req.user.id },
    });
    if (!profile) throw new HttpError(404, "Researcher profile not found");
    const ownership = await prisma.publicationAuthor.findUnique({
      where: {
        publicationId_researcherId: {
          publicationId: req.params.id,
          researcherId: profile.id,
        },
      },
    });
    if (!ownership)
      throw new HttpError(403, "You may only edit your own publications");
    const publication = await prisma.publication.findUniqueOrThrow({
      where: { id: req.params.id },
      select: { workflowStatus: true },
    });
    assertResearcherCanEdit(publication.workflowStatus);
    const data = z
      .object({
        title: z.string().min(3).optional(),
        abstract: z.string().min(20).optional(),
        venue: z.string().min(2).optional(),
        keywords: z.array(z.string()).optional(),
        pdfUrl: z.string().url().nullable().optional(),
        externalUrl: z.string().url().nullable().optional(),
      })
      .parse(req.body);
    res.json(
      await prisma.publication.update({
        where: { id: req.params.id },
        data: { ...data, ...(data.title && { slug: slugify(data.title) }) },
      }),
    );
  }),
);
