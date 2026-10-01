import { z } from "zod";
import { Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../config/db.js";
import { HttpError } from "../../utils/http.js";
import { LocalGenerationError } from "./ollama.service.js";
import {
  summarizeCompleteDocument,
  buildSummaryFallback,
  type PublicationMetadata,
  type SummaryChunk,
  type SummaryDetail,
} from "./summary-engine.js";
export {
  createSummaryEngine,
  summarizeCompleteDocument,
  buildSummaryFallback,
} from "./summary-engine.js";
export type {
  StructuredPublicationSummary,
  SummaryDetail,
} from "./summary-engine.js";

interface SummaryStatusRecord {
  id: string;
  documentId: string;
  detailLevel: SummaryDetail;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  mode: "OLLAMA" | "FALLBACK" | null;
  model: string | null;
  content: unknown;
  failureCode: string | null;
  failureMessage: string | null;
  updatedAt: Date;
}

interface ClaimedSummary extends SummaryStatusRecord {
  publication: PublicationMetadata;
  chunks: SummaryChunk[];
}

interface SummaryRepository {
  queue: (
    documentId: string,
    detailLevel: SummaryDetail,
  ) => Promise<SummaryStatusRecord>;
  claim: (summaryId: string) => Promise<ClaimedSummary | null>;
  ready: (
    summaryId: string,
    content: unknown,
    mode: "OLLAMA" | "FALLBACK",
    model: string | null,
  ) => Promise<void>;
  failed: (summaryId: string, code: string, message: string) => Promise<void>;
}

export interface SummaryStatusDto
  extends Omit<SummaryStatusRecord, "updatedAt"> {
  updatedAt: string;
}

const toSummaryStatusDto = (record: SummaryStatusRecord): SummaryStatusDto => ({
  ...record,
  updatedAt: record.updatedAt.toISOString(),
});

const summarySelect = {
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
} as const;

const summaryRepository: SummaryRepository = {
  async queue(documentId, detailLevel) {
    const document = await prisma.publicationDocument.findUnique({
      where: { id: documentId },
      select: { status: true },
    });
    if (!document) throw new HttpError(404, "Publication document not found");
    if (document.status !== "READY")
      throw new HttpError(
        409,
        "The PDF must finish processing before it can be summarized",
      );
    const existing = await prisma.publicationSummary.findUnique({
      where: { documentId_detailLevel: { documentId, detailLevel } },
      select: summarySelect,
    });
    if (existing && existing.status !== "FAILED")
      return existing as SummaryStatusRecord;
    if (existing) {
      return prisma.publicationSummary.update({
        where: { id: existing.id },
        data: {
          status: "PENDING",
          mode: null,
          model: null,
          content: Prisma.JsonNull,
          failureCode: null,
          failureMessage: null,
        },
        select: summarySelect,
      }) as Promise<SummaryStatusRecord>;
    }
    return prisma.publicationSummary.create({
      data: { documentId, detailLevel },
      select: summarySelect,
    }) as Promise<SummaryStatusRecord>;
  },
  async claim(summaryId) {
    const claimed = await prisma.publicationSummary.updateMany({
      where: { id: summaryId, status: "PENDING" },
      data: { status: "PROCESSING", failureCode: null, failureMessage: null },
    });
    if (claimed.count !== 1) return null;
    const job = await prisma.publicationSummary.findUnique({
      where: { id: summaryId },
      include: {
        document: {
          include: {
            publication: {
              include: {
                authors: {
                  include: { researcher: true },
                  orderBy: { authorOrder: "asc" },
                },
              },
            },
            chunks: { orderBy: { chunkIndex: "asc" } },
          },
        },
      },
    });
    if (!job) return null;
    return {
      id: job.id,
      documentId: job.documentId,
      detailLevel: job.detailLevel,
      status: job.status,
      mode: job.mode,
      model: job.model,
      content: job.content,
      failureCode: job.failureCode,
      failureMessage: job.failureMessage,
      updatedAt: job.updatedAt,
      publication: {
        title: job.document.publication.title,
        abstract: job.document.publication.abstract,
        authors: job.document.publication.authors.map(
          (author) => author.researcher.name,
        ),
        publicationDate: job.document.publication.publicationDate
          .toISOString()
          .slice(0, 10),
      },
      chunks: job.document.chunks,
    };
  },
  async ready(summaryId, content, mode, model) {
    const pages = z
      .object({ sourcePages: z.array(z.number().int().positive()) })
      .safeParse(content);
    await prisma.publicationSummary.update({
      where: { id: summaryId },
      data: {
        status: "READY",
        content: content as Prisma.InputJsonValue,
        mode,
        model,
        sourcePages: pages.success ? pages.data.sourcePages : [],
        failureCode: null,
        failureMessage: null,
      },
    });
  },
  async failed(summaryId, code, message) {
    await prisma.publicationSummary.update({
      where: { id: summaryId },
      data: { status: "FAILED", failureCode: code, failureMessage: message },
    });
  },
};

export function createSummaryJobService({
  repository,
  summarize,
}: {
  repository: SummaryRepository;
  summarize: typeof summarizeCompleteDocument;
}) {
  return {
    async queueSummary(documentId: string, detailLevel: SummaryDetail) {
      return toSummaryStatusDto(
        await repository.queue(documentId, detailLevel),
      );
    },
    async processSummary(summaryId: string) {
      const job = await repository.claim(summaryId);
      if (!job) return false;
      try {
        const content = await summarize(
          job.publication,
          job.chunks,
          job.detailLevel,
        );
        await repository.ready(job.id, content, "OLLAMA", env.OLLAMA_MODEL);
      } catch (error) {
        if (error instanceof LocalGenerationError) {
          await repository.ready(
            job.id,
            buildSummaryFallback(job.publication, job.chunks, job.detailLevel),
            "FALLBACK",
            null,
          );
        } else {
          await repository.failed(
            job.id,
            "SUMMARY_FAILED",
            "The document summary could not be generated. Please retry.",
          );
        }
      }
      return true;
    },
  };
}

const summaryJobs = createSummaryJobService({
  repository: summaryRepository,
  summarize: summarizeCompleteDocument,
});
export const queueSummary = summaryJobs.queueSummary;
export const processSummary = summaryJobs.processSummary;

export async function processNextSummary() {
  const pending = await prisma.publicationSummary.findFirst({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return pending ? processSummary(pending.id) : false;
}
