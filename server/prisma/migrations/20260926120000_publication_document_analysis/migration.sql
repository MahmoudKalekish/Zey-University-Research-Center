-- CreateEnum
CREATE TYPE "PublicationWorkflowStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "DocumentProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');
CREATE TYPE "SummaryProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');
CREATE TYPE "SummaryDetailLevel" AS ENUM ('SHORT', 'STANDARD', 'DETAILED');
CREATE TYPE "SummaryMode" AS ENUM ('OLLAMA', 'FALLBACK');

-- AlterTable
ALTER TABLE "Publication"
ADD COLUMN "workflowStatus" "PublicationWorkflowStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "publishedAt" TIMESTAMP(3),
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewNote" TEXT;

-- Preserve the visibility of records that existed before moderation was introduced.
UPDATE "Publication"
SET "workflowStatus" = 'PUBLISHED',
    "publishedAt" = COALESCE("publicationDate", "createdAt");

CREATE TABLE "PublicationDocument" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "pageCount" INTEGER,
    "characterCount" INTEGER,
    "status" "DocumentProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublicationDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "pageStart" INTEGER NOT NULL,
    "pageEnd" INTEGER NOT NULL,
    "sectionTitle" TEXT,
    "content" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "tokenEstimate" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublicationSummary" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "detailLevel" "SummaryDetailLevel" NOT NULL,
    "status" "SummaryProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "model" TEXT,
    "mode" "SummaryMode",
    "content" JSONB,
    "sourcePages" INTEGER[],
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublicationSummary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicationDocument_publicationId_key" ON "PublicationDocument"("publicationId");
CREATE UNIQUE INDEX "PublicationDocument_storageKey_key" ON "PublicationDocument"("storageKey");
CREATE INDEX "PublicationDocument_status_createdAt_idx" ON "PublicationDocument"("status", "createdAt");
CREATE UNIQUE INDEX "DocumentChunk_documentId_chunkIndex_key" ON "DocumentChunk"("documentId", "chunkIndex");
CREATE INDEX "DocumentChunk_documentId_pageStart_idx" ON "DocumentChunk"("documentId", "pageStart");
CREATE UNIQUE INDEX "PublicationSummary_documentId_detailLevel_key" ON "PublicationSummary"("documentId", "detailLevel");
CREATE INDEX "PublicationSummary_status_createdAt_idx" ON "PublicationSummary"("status", "createdAt");

ALTER TABLE "PublicationDocument" ADD CONSTRAINT "PublicationDocument_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PublicationDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicationSummary" ADD CONSTRAINT "PublicationSummary_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PublicationDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
