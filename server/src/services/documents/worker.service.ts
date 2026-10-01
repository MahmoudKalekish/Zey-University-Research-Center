import { prisma } from "../../config/db.js";
import { chunkPages, isTextUsable, type ChunkDraft } from "./chunk.service.js";
import { extractPdfPages, PdfProcessingError, type ExtractedPage } from "./pdf.service.js";
import { resolveStoragePath } from "./storage.service.js";
import { processNextSummary } from "./summary.service.js";

interface ClaimedDocument {
  id: string;
  storageKey: string;
}

interface WorkerRepository {
  claimPending: () => Promise<ClaimedDocument | null>;
  complete: (id: string, pages: ExtractedPage[], chunks: ChunkDraft[]) => Promise<void>;
  fail: (id: string, code: string, message: string) => Promise<void>;
  recoverInterrupted: () => Promise<number>;
}

interface WorkerDependencies {
  repository: WorkerRepository;
  resolvePath: (storageKey: string) => string;
  extract: typeof extractPdfPages;
  usable: typeof isTextUsable;
  chunk: typeof chunkPages;
}

const repository: WorkerRepository = {
  async claimPending() {
    const candidate = await prisma.publicationDocument.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: { id: true, storageKey: true },
    });
    if (!candidate) return null;
    const claimed = await prisma.publicationDocument.updateMany({
      where: { id: candidate.id, status: "PENDING" },
      data: { status: "PROCESSING", failureCode: null, failureMessage: null },
    });
    return claimed.count === 1 ? candidate : null;
  },
  async complete(id, pages, chunks) {
    await prisma.$transaction(async (transaction) => {
      await transaction.documentChunk.deleteMany({ where: { documentId: id } });
      await transaction.documentChunk.createMany({
        data: chunks.map((chunk) => ({ documentId: id, ...chunk })),
      });
      await transaction.publicationDocument.update({
        where: { id },
        data: {
          status: "READY",
          pageCount: pages.length,
          characterCount: pages.reduce((total, page) => total + page.text.length, 0),
          processedAt: new Date(),
          failureCode: null,
          failureMessage: null,
        },
      });
    });
  },
  async fail(id, code, message) {
    await prisma.publicationDocument.update({
      where: { id },
      data: { status: "FAILED", failureCode: code, failureMessage: message, processedAt: new Date() },
    });
  },
  async recoverInterrupted() {
    const [documents, summaries] = await prisma.$transaction([
      prisma.publicationDocument.updateMany({
        where: { status: "PROCESSING" },
        data: { status: "PENDING", failureCode: null, failureMessage: null },
      }),
      prisma.publicationSummary.updateMany({
        where: { status: "PROCESSING" },
        data: { status: "PENDING", failureCode: null, failureMessage: null },
      }),
    ]);
    return documents.count + summaries.count;
  },
};

export function createDocumentWorker(dependencies: WorkerDependencies) {
  return {
    async processNextDocument() {
      const document = await dependencies.repository.claimPending();
      if (!document) return false;
      try {
        const extracted = await dependencies.extract(dependencies.resolvePath(document.storageKey));
        if (!dependencies.usable(extracted.pages)) {
          await dependencies.repository.fail(
            document.id,
            "OCR_REQUIRED",
            "No usable embedded text was found. This PDF may be scanned and requires OCR.",
          );
          return true;
        }
        await dependencies.repository.complete(document.id, extracted.pages, dependencies.chunk(extracted.pages));
      } catch (error) {
        const corrupt = error instanceof PdfProcessingError && error.code === "CORRUPT_OR_ENCRYPTED_PDF";
        await dependencies.repository.fail(
          document.id,
          corrupt ? "CORRUPT_OR_ENCRYPTED_PDF" : "PROCESSING_FAILED",
          corrupt
            ? "The PDF is corrupt, encrypted, or cannot be read"
            : "The document could not be processed. Please retry or replace the PDF.",
        );
      }
      return true;
    },
    recoverInterruptedJobs: dependencies.repository.recoverInterrupted,
  };
}

const worker = createDocumentWorker({
  repository,
  resolvePath: resolveStoragePath,
  extract: extractPdfPages,
  usable: isTextUsable,
  chunk: chunkPages,
});

export const processNextDocument = worker.processNextDocument;
export const recoverInterruptedJobs = worker.recoverInterruptedJobs;
export type StopWorker = () => void;

export function startDocumentWorker(intervalMilliseconds = 1500): StopWorker {
  let stopped = false;
  let processing = false;
  const poll = async () => {
    if (stopped || processing) return;
    processing = true;
    try {
      while (!stopped) {
        const processedDocument = await processNextDocument();
        const processedSummary = await processNextSummary();
        if (!processedDocument && !processedSummary) break;
      }
    } catch (error) {
      console.error("Publication document worker failed", error);
    } finally {
      processing = false;
    }
  };
  void recoverInterruptedJobs().then(poll).catch((error) => {
    console.error("Publication document recovery failed", error);
  });
  const timer = setInterval(() => void poll(), intervalMilliseconds);
  timer.unref();
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
