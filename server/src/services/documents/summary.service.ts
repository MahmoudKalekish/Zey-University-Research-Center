import { z } from "zod";
import { Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../config/db.js";
import { HttpError } from "../../utils/http.js";
import { generateLocalJson, LocalGenerationError } from "./ollama.service.js";

const evidenceItemSchema = z.object({
  text: z.string().min(1),
  pages: z.array(z.number().int().positive()),
});
const evidenceSchema = z.object({
  objective: z.array(evidenceItemSchema),
  methodology: z.array(evidenceItemSchema),
  findings: z.array(evidenceItemSchema),
  conclusions: z.array(evidenceItemSchema),
  limitations: z.array(evidenceItemSchema),
  significance: z.array(evidenceItemSchema),
  keywords: z.array(z.string().min(1)),
});
const sectionSchema = z.object({
  text: z.string().min(1),
  pages: z.array(z.number().int().positive()),
});
const finalSummarySchema = z.object({
  inShort: sectionSchema,
  researchObjective: sectionSchema,
  methodology: sectionSchema,
  keyFindings: sectionSchema,
  conclusions: sectionSchema,
  limitations: sectionSchema,
  whyItMatters: sectionSchema,
  keywords: z.array(z.string().min(1)),
});

export type SummaryDetail = "SHORT" | "STANDARD" | "DETAILED";
export type StructuredPublicationSummary = z.infer<typeof finalSummarySchema> & {
  detailLevel: SummaryDetail;
  sourcePages: number[];
};

interface PublicationMetadata {
  title: string;
  abstract: string;
  authors: string[];
  publicationDate: string;
}
interface SummaryChunk {
  chunkIndex: number;
  pageStart: number;
  pageEnd: number;
  sectionTitle: string | null | undefined;
  content: string;
}
type JsonGenerator = (prompt: string, schema: z.ZodTypeAny, options?: { maxOutputTokens?: number }) => Promise<unknown>;

function renderChunk(chunk: SummaryChunk) {
  return `[Pages ${chunk.pageStart}-${chunk.pageEnd}]${chunk.sectionTitle ? ` ${chunk.sectionTitle}` : ""}\n${chunk.content}`;
}

function partitionChunks(chunks: SummaryChunk[], budget: number) {
  const batches: SummaryChunk[][] = [];
  let batch: SummaryChunk[] = [];
  let size = 0;
  for (const chunk of chunks) {
    const renderedSize = renderChunk(chunk).length;
    if (batch.length && size + renderedSize > budget) {
      batches.push(batch);
      batch = [];
      size = 0;
    }
    batch.push(chunk);
    size += renderedSize;
  }
  if (batch.length) batches.push(batch);
  return batches;
}

function pageSet(chunks: SummaryChunk[]) {
  const pages = new Set<number>();
  for (const chunk of chunks) {
    for (let page = chunk.pageStart; page <= chunk.pageEnd; page += 1) pages.add(page);
  }
  return pages;
}

function normalizeSummary(summary: z.infer<typeof finalSummarySchema>, chunks: SummaryChunk[], detailLevel: SummaryDetail) {
  const validPages = pageSet(chunks);
  const sections = ["inShort", "researchObjective", "methodology", "keyFindings", "conclusions", "limitations", "whyItMatters"] as const;
  const normalized = { ...summary };
  for (const section of sections) {
    normalized[section] = {
      text: normalized[section].text.trim() || "Not stated in the document",
      pages: [...new Set(normalized[section].pages.filter((page) => validPages.has(page)))].sort((a, b) => a - b),
    };
  }
  const sourcePages = [...new Set(sections.flatMap((section) => normalized[section].pages))].sort((a, b) => a - b);
  const common = { detailLevel, inShort: normalized.inShort, keyFindings: normalized.keyFindings, keywords: normalized.keywords, sourcePages };
  return detailLevel === "SHORT" ? common : { ...common, researchObjective: normalized.researchObjective, methodology: normalized.methodology, conclusions: normalized.conclusions, limitations: normalized.limitations, whyItMatters: normalized.whyItMatters };
}

export function createSummaryEngine({
  generate,
  batchCharacterBudget = env.DOCUMENT_SUMMARY_BATCH_CHARS,
}: {
  generate: JsonGenerator;
  batchCharacterBudget?: number;
}) {
  return {
    async summarize(publication: PublicationMetadata, chunks: SummaryChunk[], detailLevel: SummaryDetail) {
      const batches = partitionChunks(chunks, batchCharacterBudget);
      const evidence = [];
      for (const [index, batch] of batches.entries()) {
        const prompt = `EVIDENCE_BATCH ${index + 1}/${batches.length}\nExtract evidence only from these pages under objective, methodology, findings, conclusions, limitations, significance, and keywords. Preserve page numbers. Never invent missing information.\n${batch.map(renderChunk).join("\n\n")}`;
        const result = await generate(prompt, evidenceSchema, { maxOutputTokens: 900 });
        evidence.push(evidenceSchema.parse(result));
      }
      const finalPrompt = `FINAL_SYNTHESIS ${detailLevel}\nCreate a structured academic summary using only the evidence JSON below. Use 'Not stated in the document' when absent. Do not invent citations, statistics, methods, findings, conclusions, or limitations. Keep In Short to 3-5 sentences and attach page evidence to every section.\nPUBLICATION_METADATA: ${JSON.stringify(publication)}\nEVIDENCE: ${JSON.stringify(evidence)}`;
      const generated = finalSummarySchema.parse(await generate(finalPrompt, finalSummarySchema, { maxOutputTokens: detailLevel === "DETAILED" ? 1200 : 900 }));
      return normalizeSummary(generated, chunks, detailLevel);
    },
  };
}

const summaryEngine = createSummaryEngine({ generate: generateLocalJson });
export const summarizeCompleteDocument = summaryEngine.summarize;

export function buildSummaryFallback(
  publication: PublicationMetadata,
  chunks: SummaryChunk[],
  detailLevel: SummaryDetail = "STANDARD",
) {
  const sectionPattern = /methods?|methodology|results?|discussion|conclusions?|limitations?/i;
  const evidence = chunks
    .filter((chunk) => sectionPattern.test(chunk.sectionTitle ?? ""))
    .map((chunk) => ({
      section: chunk.sectionTitle ?? "Evidence",
      text: chunk.content.slice(0, 700).trim(),
      pages: chunk.pageStart === chunk.pageEnd ? [chunk.pageStart] : [chunk.pageStart, chunk.pageEnd],
    }));
  return {
    detailLevel,
    mode: "FALLBACK" as const,
    notice: "Local AI synthesis is temporarily unavailable. The passages below are deterministic evidence from the uploaded document, not a generated full-document synthesis.",
    metadata: publication,
    evidence,
    sourcePages: [...new Set(evidence.flatMap((item) => item.pages))].sort((a, b) => a - b),
  };
}

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
  queue: (documentId: string, detailLevel: SummaryDetail) => Promise<SummaryStatusRecord>;
  claim: (summaryId: string) => Promise<ClaimedSummary | null>;
  ready: (summaryId: string, content: unknown, mode: "OLLAMA" | "FALLBACK", model: string | null) => Promise<void>;
  failed: (summaryId: string, code: string, message: string) => Promise<void>;
}

export interface SummaryStatusDto extends Omit<SummaryStatusRecord, "updatedAt"> {
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
    if (document.status !== "READY") throw new HttpError(409, "The PDF must finish processing before it can be summarized");
    const existing = await prisma.publicationSummary.findUnique({
      where: { documentId_detailLevel: { documentId, detailLevel } },
      select: summarySelect,
    });
    if (existing && existing.status !== "FAILED") return existing as SummaryStatusRecord;
    if (existing) {
      return prisma.publicationSummary.update({
        where: { id: existing.id },
        data: { status: "PENDING", mode: null, model: null, content: Prisma.JsonNull, failureCode: null, failureMessage: null },
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
              include: { authors: { include: { researcher: true }, orderBy: { authorOrder: "asc" } } },
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
        authors: job.document.publication.authors.map((author) => author.researcher.name),
        publicationDate: job.document.publication.publicationDate.toISOString().slice(0, 10),
      },
      chunks: job.document.chunks,
    };
  },
  async ready(summaryId, content, mode, model) {
    await prisma.publicationSummary.update({
      where: { id: summaryId },
      data: {
        status: "READY",
        content: content as Prisma.InputJsonValue,
        mode,
        model,
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
      return toSummaryStatusDto(await repository.queue(documentId, detailLevel));
    },
    async processSummary(summaryId: string) {
      const job = await repository.claim(summaryId);
      if (!job) return false;
      try {
        const content = await summarize(job.publication, job.chunks, job.detailLevel);
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
