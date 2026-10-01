import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../config/db.js";
import { authenticate } from "../middleware/auth.js";
import { publicationPdfUpload } from "../middleware/publication-upload.js";
import {
  requirePublicationManager,
  requirePublicOrManagerAccess,
} from "../services/publication-access.service.js";
import {
  getDocumentStatus,
  replacePublicationDocument,
} from "../services/documents/document.service.js";
import { answerDocumentQuestion } from "../services/documents/question.service.js";
import { queueSummary } from "../services/documents/summary.service.js";
import { resolveStoragePath } from "../services/documents/storage.service.js";
import { HttpError } from "../utils/http.js";
import { researcherPublicationDraftSchema } from "../validation/schemas.js";
import { slugify } from "../utils/http.js";

import { createPublicationLifecycleService } from "./publication-lifecycle.service.js";
import type { RouteDependencies } from "../routes/publication-document.routes.js";
export const publicationDocumentDependencies: RouteDependencies = {
  authenticate,
  upload: publicationPdfUpload,
  requireManager: requirePublicationManager,
  replaceDocument: replacePublicationDocument,
  status: getDocumentStatus,
  async retry(publicationId) {
    return prisma.publicationDocument.update({
      where: { publicationId },
      data: {
        status: "PENDING",
        failureCode: null,
        failureMessage: null,
        processedAt: null,
      },
      select: {
        id: true,
        publicationId: true,
        status: true,
        failureCode: true,
        failureMessage: true,
      },
    });
  },
  transition: createPublicationLifecycleService({
    find: (id) =>
      prisma.publication.findUnique({
        where: { id },
        include: { document: { select: { status: true } } },
      }),
    async transition(id, expectedStatus, data) {
      return prisma.$transaction(async (transaction) => {
        const changed = await transaction.publication.updateMany({
          where: {
            id,
            workflowStatus: expectedStatus,
            ...(data.workflowStatus === "PUBLISHED" ||
            data.workflowStatus === "READY_FOR_REVIEW"
              ? { document: { is: { status: "READY" } } }
              : {}),
          },
          data,
        });
        if (changed.count !== 1)
          throw new HttpError(
            409,
            "The publication changed during review. Refresh and try again.",
          );
        return transaction.publication.findUniqueOrThrow({ where: { id } });
      });
    },
  }).transition,
  async createResearcherDraft(userId, input) {
    const data = researcherPublicationDraftSchema.parse(input);
    const { areaIds, ...publicationData } = data;
    const researcher = await prisma.researcher.findUnique({
      where: { userId },
      select: { id: true, active: true },
    });
    if (!researcher?.active)
      throw new HttpError(403, "An active researcher profile is required");
    return prisma.publication.create({
      data: {
        ...publicationData,
        slug: slugify(data.title),
        workflowStatus: "DRAFT",
        areas: { create: areaIds.map((areaId) => ({ areaId })) },
        authors: { create: [{ researcherId: researcher.id, authorOrder: 0 }] },
      },
      include: { authors: true, areas: true },
    });
  },
  async resolvePublic(slug, userId) {
    const publication = await prisma.publication.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        document: { select: { id: true, status: true } },
      },
    });
    if (!publication) throw new HttpError(404, "Publication not found");
    await requirePublicOrManagerAccess(publication.id, userId);
    if (!publication.document || publication.document.status !== "READY") {
      throw new HttpError(409, "The publication PDF is not ready");
    }
    return {
      id: publication.id,
      slug: publication.slug,
      documentId: publication.document.id,
    };
  },
  async streamDocument(slug, userId, response, next) {
    try {
      const publication = await prisma.publication.findUnique({
        where: { slug },
        select: {
          id: true,
          document: {
            select: { status: true, storageKey: true, originalName: true },
          },
        },
      });
      if (!publication) throw new HttpError(404, "Publication not found");
      await requirePublicOrManagerAccess(publication.id, userId);
      if (!publication.document || publication.document.status !== "READY")
        throw new HttpError(404, "Publication document not found");
      const absolutePath = resolveStoragePath(publication.document.storageKey);
      const information = await stat(absolutePath);
      const safeName = path
        .basename(publication.document.originalName)
        .replace(/["\r\n]/g, "_");
      response.set({
        "Content-Type": "application/pdf",
        "Content-Length": String(information.size),
        "Content-Disposition": `inline; filename="${safeName}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=0, must-revalidate",
      });
      createReadStream(absolutePath).on("error", next).pipe(response);
    } catch (error) {
      next(error);
    }
  },
  queueSummary,
  async summaryStatus(documentId, level) {
    const summary = await prisma.publicationSummary.findUnique({
      where: { documentId_detailLevel: { documentId, detailLevel: level } },
      select: {
        id: true,
        documentId: true,
        detailLevel: true,
        status: true,
        mode: true,
        model: true,
        content: true,
        failureCode: true,
        failureMessage: true,
        updatedAt: true,
      },
    });
    if (!summary)
      throw new HttpError(404, "This summary has not been requested");
    return summary;
  },
  askQuestion: answerDocumentQuestion,
};
