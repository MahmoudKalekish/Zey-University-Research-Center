import type { DocumentProcessingStatus } from "@prisma/client";
import { prisma } from "../../config/db.js";
import { HttpError } from "../../utils/http.js";
import {
  deleteStoredPdf,
  storePdf,
  type StoredPdf,
  validatePdfUpload,
} from "./storage.service.js";

interface DocumentStatusRecord {
  id: string;
  publicationId: string;
  status: DocumentProcessingStatus;
  originalName: string;
  sizeBytes: number;
  pageCount: number | null;
  characterCount: number | null;
  failureCode: string | null;
  failureMessage: string | null;
  processedAt: Date | null;
  updatedAt: Date;
}

export interface DocumentStatusDto extends Omit<DocumentStatusRecord, "processedAt" | "updatedAt"> {
  processedAt: string | null;
  updatedAt: string;
}

interface ReplacementInput {
  publicationId: string;
  originalName: string;
  mimeType: string;
  stored: StoredPdf;
}

interface DocumentServiceDependencies {
  validateUpload: (file: Express.Multer.File) => void;
  store: (buffer: Buffer) => Promise<StoredPdf>;
  remove: (storageKey: string) => Promise<void>;
  replaceRecord: (input: ReplacementInput) => Promise<{
    previousStorageKey: string | null;
    document: DocumentStatusRecord;
  }>;
  findStatus: (publicationId: string) => Promise<DocumentStatusRecord | null>;
}

const toStatusDto = (document: DocumentStatusRecord): DocumentStatusDto => ({
  ...document,
  processedAt: document.processedAt?.toISOString() ?? null,
  updatedAt: document.updatedAt.toISOString(),
});

const prismaRepository = {
  async replaceRecord(input: ReplacementInput) {
    return prisma.$transaction(async (transaction) => {
      const publication = await transaction.publication.findUnique({
        where: { id: input.publicationId },
        select: { id: true },
      });
      if (!publication) throw new HttpError(404, "Publication not found");
      const previous = await transaction.publicationDocument.findUnique({
        where: { publicationId: input.publicationId },
        select: { id: true, storageKey: true },
      });
      if (previous) {
        await transaction.publicationSummary.deleteMany({ where: { documentId: previous.id } });
        await transaction.documentChunk.deleteMany({ where: { documentId: previous.id } });
      }
      const document = await transaction.publicationDocument.upsert({
        where: { publicationId: input.publicationId },
        create: {
          publicationId: input.publicationId,
          originalName: input.originalName,
          mimeType: input.mimeType,
          storageKey: input.stored.storageKey,
          sizeBytes: input.stored.sizeBytes,
          sha256: input.stored.sha256,
        },
        update: {
          originalName: input.originalName,
          mimeType: input.mimeType,
          storageKey: input.stored.storageKey,
          sizeBytes: input.stored.sizeBytes,
          sha256: input.stored.sha256,
          pageCount: null,
          characterCount: null,
          status: "PENDING",
          failureCode: null,
          failureMessage: null,
          processedAt: null,
        },
        select: {
          id: true,
          publicationId: true,
          status: true,
          originalName: true,
          sizeBytes: true,
          pageCount: true,
          characterCount: true,
          failureCode: true,
          failureMessage: true,
          processedAt: true,
          updatedAt: true,
        },
      });
      return { previousStorageKey: previous?.storageKey ?? null, document };
    });
  },
  findStatus(publicationId: string) {
    return prisma.publicationDocument.findUnique({
      where: { publicationId },
      select: {
        id: true,
        publicationId: true,
        status: true,
        originalName: true,
        sizeBytes: true,
        pageCount: true,
        characterCount: true,
        failureCode: true,
        failureMessage: true,
        processedAt: true,
        updatedAt: true,
      },
    });
  },
};

export function createDocumentService(dependencies: DocumentServiceDependencies) {
  return {
    async replacePublicationDocument(publicationId: string, upload: Express.Multer.File) {
      dependencies.validateUpload(upload);
      const stored = await dependencies.store(upload.buffer);
      let replacement;
      try {
        replacement = await dependencies.replaceRecord({
          publicationId,
          originalName: upload.originalname,
          mimeType: upload.mimetype,
          stored,
        });
      } catch (error) {
        await dependencies.remove(stored.storageKey).catch(() => undefined);
        throw error;
      }
      if (replacement.previousStorageKey && replacement.previousStorageKey !== stored.storageKey) {
        await dependencies.remove(replacement.previousStorageKey).catch((error) => {
          console.warn("Could not remove replaced publication file", error);
        });
      }
      return toStatusDto(replacement.document);
    },
    async getDocumentStatus(publicationId: string) {
      const document = await dependencies.findStatus(publicationId);
      if (!document) throw new HttpError(404, "Publication document not found");
      return toStatusDto(document);
    },
  };
}

const service = createDocumentService({
  validateUpload: validatePdfUpload,
  store: storePdf,
  remove: deleteStoredPdf,
  replaceRecord: prismaRepository.replaceRecord,
  findStatus: prismaRepository.findStatus,
});

export const replacePublicationDocument = service.replacePublicationDocument;
export const getDocumentStatus = service.getDocumentStatus;
