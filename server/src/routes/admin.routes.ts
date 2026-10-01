import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/db.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler, slugify, HttpError } from "../utils/http.js";
import {
  areaSchema,
  projectSchema,
  publicationSchema,
  researcherSchema,
  userSchema,
} from "../validation/schemas.js";
import { z } from "zod";
import { deletePublicationWithDocument } from "../services/documents/document.service.js";
export const adminRouter = Router();
adminRouter.use(authenticate, authorize("ADMIN"));
adminRouter.get(
  "/stats",
  asyncHandler(async (_q: any, r: any) => {
    const [users, researchers, projects, publications, messages] =
      await Promise.all([
        prisma.user.count(),
        prisma.researcher.count(),
        prisma.project.count(),
        prisma.publication.count(),
        prisma.contactMessage.count({ where: { status: "NEW" } }),
      ]);
    r.json({ users, researchers, projects, publications, messages });
  }),
);
const models: any = {
  users: prisma.user,
  researchers: prisma.researcher,
  areas: prisma.researchArea,
  projects: prisma.project,
  publications: prisma.publication,
  events: prisma.event,
  news: prisma.news,
  resources: prisma.resource,
  messages: prisma.contactMessage,
};
adminRouter.get(
  "/:entity",
  asyncHandler(async (req: any, res: any) => {
    const model = models[req.params.entity];
    if (!model) throw new HttpError(404, "Unknown management module");
    if (req.params.entity === "users") {
      return res.json(
        await prisma.user.findMany({
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            active: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
      );
    }
    if (req.params.entity === "publications") {
      return res.json(
        await prisma.publication.findMany({
          take: 100,
          orderBy: { createdAt: "desc" },
          include: {
            areas: true,
            authors: { orderBy: { authorOrder: "asc" } },
            document: { select: { status: true, pageCount: true } },
          },
        }),
      );
    }
    res.json(
      await model.findMany({ take: 100, orderBy: { createdAt: "desc" } }),
    );
  }),
);
adminRouter.post(
  "/users",
  asyncHandler(async (req: any, res: any) => {
    const d = userSchema.parse(req.body);
    if (!d.password) throw new HttpError(422, "Password is required");
    res.status(201).json(
      await prisma.user.create({
        data: {
          ...d,
          passwordHash: await bcrypt.hash(d.password, 12),
          password: undefined,
        } as any,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          active: true,
        },
      }),
    );
  }),
);
adminRouter.put(
  "/publications/:id",
  asyncHandler(async (req: any, res: any) => {
    const { areaIds, authorIds, ...data } = publicationSchema
      .partial()
      .parse(req.body);
    const result = await prisma.$transaction(async (tx) => {
      if (areaIds)
        await tx.publicationArea.deleteMany({
          where: { publicationId: req.params.id },
        });
      if (authorIds)
        await tx.publicationAuthor.deleteMany({
          where: { publicationId: req.params.id },
        });
      return tx.publication.update({
        where: { id: req.params.id },
        data: {
          ...data,
          ...(data.title && { slug: slugify(data.title) }),
          ...(areaIds && {
            areas: { create: areaIds.map((areaId) => ({ areaId })) },
          }),
          ...(authorIds && {
            authors: {
              create: authorIds.map((researcherId, authorOrder) => ({
                researcherId,
                authorOrder,
              })),
            },
          }),
        },
      });
    });
    res.json(result);
  }),
);

const eventSchema = z.object({
  title: z.string().trim().min(3, "Title must contain at least 3 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Description must contain at least 10 characters"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  location: z
    .string()
    .trim()
    .min(2, "Location must contain at least 2 characters"),
  imageUrl: z.string().url("Enter a valid image URL").nullable().optional(),
  registrationUrl: z
    .string()
    .url("Enter a valid registration URL")
    .nullable()
    .optional(),
  published: z.boolean().default(true),
});
const newsSchema = z.object({
  title: z.string().trim().min(3, "Title must contain at least 3 characters"),
  excerpt: z
    .string()
    .trim()
    .min(5, "Excerpt must contain at least 5 characters"),
  content: z
    .string()
    .trim()
    .min(10, "Content must contain at least 10 characters"),
  imageUrl: z.string().url("Enter a valid image URL").nullable().optional(),
  publishedAt: z.coerce.date().nullable().optional(),
  published: z.boolean().default(false),
});
const resourceSchema = z.object({
  title: z.string().trim().min(3, "Title must contain at least 3 characters"),
  description: z
    .string()
    .trim()
    .min(5, "Description must contain at least 5 characters"),
  type: z.enum(["DOCUMENT", "DATASET", "SOFTWARE", "LINK"]),
  url: z.string().url("Enter a valid URL beginning with http:// or https://"),
  published: z.boolean().default(true),
});
const contentSchemas: Record<string, z.ZodTypeAny> = {
  events: eventSchema,
  news: newsSchema,
  resources: resourceSchema,
};
adminRouter.post(
  "/:entity",
  asyncHandler(async (req: any, res: any, next: any) => {
    const schema = contentSchemas[req.params.entity];
    if (!schema) return next();
    const data = schema.parse(req.body);
    const model = models[req.params.entity];
    res.status(201).json(
      await model.create({
        data: {
          ...data,
          ...(["events", "news"].includes(req.params.entity) && {
            slug: slugify(data.title),
          }),
        },
      }),
    );
  }),
);
adminRouter.put(
  "/:entity/:id",
  asyncHandler(async (req: any, res: any, next: any) => {
    const schema: any = contentSchemas[req.params.entity];
    if (!schema) return next();
    const data = schema.partial().parse(req.body);
    const model = models[req.params.entity];
    res.json(
      await model.update({
        where: { id: req.params.id },
        data: {
          ...data,
          ...(data.title &&
            req.params.entity !== "resources" && { slug: slugify(data.title) }),
        },
      }),
    );
  }),
);
adminRouter.put(
  "/users/:id",
  asyncHandler(async (req: any, res: any) => {
    const d = userSchema.partial().parse(req.body),
      data: any = { ...d, password: undefined };
    if (d.password) data.passwordHash = await bcrypt.hash(d.password, 12);
    res.json(
      await prisma.user.update({
        where: { id: req.params.id },
        data,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          active: true,
        },
      }),
    );
  }),
);
adminRouter.put(
  "/messages/:id",
  asyncHandler(async (req: any, res: any) => {
    const { status } = z
      .object({ status: z.enum(["NEW", "READ", "REPLIED", "ARCHIVED"]) })
      .parse(req.body);
    res.json(
      await prisma.contactMessage.update({
        where: { id: req.params.id },
        data: { status },
      }),
    );
  }),
);
adminRouter.post(
  "/areas",
  asyncHandler(async (req: any, res: any) => {
    const d = areaSchema.parse(req.body);
    res.status(201).json(
      await prisma.researchArea.create({
        data: { ...d, slug: slugify(d.name) },
      }),
    );
  }),
);
adminRouter.put(
  "/areas/:id",
  asyncHandler(async (req: any, res: any) => {
    const d = areaSchema.partial().parse(req.body);
    res.json(
      await prisma.researchArea.update({
        where: { id: req.params.id },
        data: { ...d, ...(d.name && { slug: slugify(d.name) }) },
      }),
    );
  }),
);
adminRouter.post(
  "/researchers",
  asyncHandler(async (req: any, res: any) => {
    const { areaIds, ...d } = researcherSchema.parse(req.body);
    res.status(201).json(
      await prisma.researcher.create({
        data: {
          ...d,
          slug: slugify(d.name),
          areas: { create: areaIds.map((areaId) => ({ areaId })) },
        },
      }),
    );
  }),
);
adminRouter.put(
  "/researchers/:id",
  asyncHandler(async (req: any, res: any) => {
    const { areaIds, ...d } = researcherSchema.partial().parse(req.body);
    res.json(
      await prisma.$transaction(async (tx) => {
        if (areaIds) {
          await tx.researcherArea.deleteMany({
            where: { researcherId: req.params.id },
          });
        }
        return tx.researcher.update({
          where: { id: req.params.id },
          data: {
            ...d,
            ...(d.name && { slug: slugify(d.name) }),
            ...(areaIds && {
              areas: { create: areaIds.map((areaId) => ({ areaId })) },
            }),
          },
        });
      }),
    );
  }),
);
adminRouter.post(
  "/projects",
  asyncHandler(async (req: any, res: any) => {
    const { areaIds, researcherIds, ...d } = projectSchema.parse(req.body);
    res.status(201).json(
      await prisma.project.create({
        data: {
          ...d,
          slug: slugify(d.title),
          areas: { create: areaIds.map((areaId) => ({ areaId })) },
          researchers: {
            create: researcherIds.map((researcherId) => ({ researcherId })),
          },
        },
      }),
    );
  }),
);
adminRouter.put(
  "/projects/:id",
  asyncHandler(async (req: any, res: any) => {
    const { areaIds, researcherIds, ...d } = projectSchema
      .partial()
      .parse(req.body);
    res.json(
      await prisma.$transaction(async (tx) => {
        if (areaIds)
          await tx.projectArea.deleteMany({
            where: { projectId: req.params.id },
          });
        if (researcherIds)
          await tx.projectResearcher.deleteMany({
            where: { projectId: req.params.id },
          });
        return tx.project.update({
          where: { id: req.params.id },
          data: {
            ...d,
            ...(d.title && { slug: slugify(d.title) }),
            ...(areaIds && {
              areas: { create: areaIds.map((areaId) => ({ areaId })) },
            }),
            ...(researcherIds && {
              researchers: {
                create: researcherIds.map((researcherId) => ({ researcherId })),
              },
            }),
          },
        });
      }),
    );
  }),
);
adminRouter.post(
  "/publications",
  asyncHandler(async (req: any, res: any) => {
    const { areaIds, authorIds, ...d } = publicationSchema.parse(req.body);
    res.status(201).json(
      await prisma.publication.create({
        data: {
          ...d,
          slug: slugify(d.title),
          areas: { create: areaIds.map((areaId) => ({ areaId })) },
          authors: {
            create: authorIds.map((researcherId, authorOrder) => ({
              researcherId,
              authorOrder,
            })),
          },
        },
      }),
    );
  }),
);
adminRouter.delete(
  "/:entity/:id",
  asyncHandler(async (req: any, res: any) => {
    const model = models[req.params.entity];
    if (!model || req.params.entity === "users")
      throw new HttpError(400, "Deletion is not permitted");
    if (req.params.entity === "publications") {
      await deletePublicationWithDocument(req.params.id);
      return res.status(204).end();
    }
    await model.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
