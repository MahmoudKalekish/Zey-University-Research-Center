import { requestLimit } from "../middleware/request-limit.js";
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/db.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../utils/http.js";
import { ensureResearcherProfile } from "../services/researcher-profile.service.js";

const applicationInput = z
  .object({
    category: z.enum([
      "STUDENT",
      "FACULTY",
      "RESEARCH_STAFF",
      "EXTERNAL_COLLABORATOR",
    ]),
    institution: z.string().trim().min(3).max(150),
    department: z.string().trim().min(2).max(150),
    institutionalEmail: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    areaId: z.string().min(1).max(64),
    proposal: z.string().trim().min(80).max(2000),
    experience: z.string().trim().min(40).max(1600),
    benefit: z.string().trim().min(40).max(1600),
    keywords: z
      .array(z.string().trim().min(2).max(60))
      .min(3)
      .max(8)
      .transform((values) => [...new Set(values.map((s) => s.toLowerCase()))])
      .refine(
        (values) => values.length >= 3,
        "Enter at least three distinct keywords.",
      ),
    consent: z.literal(true),
  })
  .strict();

const reviewInput = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("APPROVED"),
    verified: z.literal(true),
    note: z.string().trim().min(10).max(1000),
  }),
  z.object({
    decision: z.literal("REJECTED"),
    note: z.string().trim().min(10).max(1000),
  }),
]);

export const researcherApplicationRouter = Router();
researcherApplicationRouter.use(authenticate, (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
researcherApplicationRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const application = await prisma.researcherApplication.findUnique({
      where: { userId: req.user!.id },
      select: { status: true, createdAt: true, reviewedAt: true },
    });
    res.json(application);
  }),
);
researcherApplicationRouter.post(
  "/",
  authorize("VISITOR"),
  requestLimit(12, 60 * 60_000),
  asyncHandler(async (req, res) => {
    const { consent, ...data } = applicationInput.parse(req.body);
    void consent;
    const applicant = req.user!;
    if (data.institutionalEmail !== applicant.email.toLowerCase())
      throw new HttpError(
        422,
        "Apply from an account registered with your institutional email.",
      );
    if (
      await prisma.researcherApplication.findUnique({
        where: { userId: applicant.id },
        select: { id: true },
      })
    )
      throw new HttpError(
        409,
        "An application is already on file for this account.",
      );
    if (
      !(await prisma.researchArea.findUnique({
        where: { id: data.areaId },
        select: { id: true },
      }))
    )
      throw new HttpError(422, "Choose an existing research area.");
    res.status(201).json(
      await prisma.researcherApplication.create({
        data: {
          ...data,
          // Retain compatibility with databases that still have this required column.
          institutionalReference: "",
          userId: applicant.id,
          applicantEmail: applicant.email,
        },
        select: { status: true, createdAt: true, reviewedAt: true },
      }),
    );
  }),
);

export const researcherApplicationAdminRouter = Router();
researcherApplicationAdminRouter.use(
  authenticate,
  authorize("ADMIN"),
  (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  },
);
researcherApplicationAdminRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        q: z.string().trim().max(100).default(""),
        status: z
          .enum(["PENDING", "APPROVED", "REJECTED", "ALL"])
          .default("PENDING"),
        page: z.coerce.number().int().min(1).max(10000).default(1),
      })
      .parse(req.query);
    const contains = { contains: query.q, mode: "insensitive" as const };
    const where: Prisma.ResearcherApplicationWhereInput = {
      ...(query.status === "ALL" ? {} : { status: query.status }),
      ...(query.q
        ? {
            OR: [
              { keywords: { has: query.q.toLowerCase() } },
              { institution: contains },
              { department: contains },
              { institutionalEmail: contains },
              { applicantEmail: contains },
              { proposal: contains },
              { benefit: contains },
              { experience: contains },
              { area: { name: contains } },
              {
                user: { OR: [{ firstName: contains }, { lastName: contains }] },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.researcherApplication.findMany({
        where,
        take: 20,
        skip: (query.page - 1) * 20,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        omit: { institutionalReference: true },
        include: {
          area: { select: { name: true } },
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.researcherApplication.count({ where }),
    ]);
    res.json({ items, total });
  }),
);
researcherApplicationAdminRouter.post(
  "/:id/review",
  asyncHandler(async (req, res) => {
    const { decision, note } = reviewInput.parse(req.body);
    const id = String(req.params.id);
    const reviewedAt = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const application = await tx.researcherApplication.findUnique({
        where: { id },
      });
      if (!application) throw new HttpError(404, "Application not found.");
      const claimed = await tx.researcherApplication.updateMany({
        where: { id, status: "PENDING" },
        data: {
          status: decision,
          reviewNote: note,
          reviewedAt,
          reviewedById: req.user!.id,
          // Discard the private ID reference once the identity check is complete.
          institutionalReference: "",
        },
      });
      if (!claimed.count)
        throw new HttpError(409, "This application has already been reviewed.");
      if (decision === "APPROVED") {
        const approved = await tx.user.updateMany({
          where: {
            id: application.userId,
            email: application.applicantEmail,
            active: true,
            role: "VISITOR",
          },
          data: { role: "RESEARCHER" },
        });
        if (!approved.count)
          throw new HttpError(
            409,
            "The applicant's account changed. Verify the current account before approval.",
          );
        const user = await tx.user.findUniqueOrThrow({
          where: { id: application.userId },
        });
        const profile = await ensureResearcherProfile(tx, user);
        await tx.researcher.update({
          where: { id: profile.id },
          data: {
            active: true,
            ...(profile.affiliation
              ? {}
              : { affiliation: application.institution }),
          },
        });
        await tx.researcherArea.upsert({
          where: {
            researcherId_areaId: {
              researcherId: profile.id,
              areaId: application.areaId,
            },
          },
          create: { researcherId: profile.id, areaId: application.areaId },
          update: {},
        });
      }
      return { status: decision, reviewedAt };
    });
    res.json(result);
  }),
);
