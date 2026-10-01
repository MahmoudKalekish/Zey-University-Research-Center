export type WorkflowStatus =
  | "DRAFT"
  | "READY_FOR_REVIEW"
  | "PUBLISHED"
  | "ARCHIVED";
export type ProcessingStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";
export type SummaryDetailLevel = "SHORT" | "STANDARD" | "DETAILED";
export type AnalysisMode = "OLLAMA" | "FALLBACK";
export interface DocumentStatus {
  id: string;
  publicationId: string;
  status: ProcessingStatus;
  originalName: string;
  sizeBytes: number;
  pageCount: number | null;
  characterCount: number | null;
  failureCode: string | null;
  failureMessage: string | null;
  processedAt: string | null;
  updatedAt: string;
}
export interface SummarySection {
  text: string;
  pages: number[];
}
export interface StructuredSummary {
  detailLevel: SummaryDetailLevel;
  inShort: SummarySection;
  keyFindings: SummarySection;
  researchObjective?: SummarySection;
  methodology?: SummarySection;
  conclusions?: SummarySection;
  limitations?: SummarySection;
  whyItMatters?: SummarySection;
  keywords: string[];
  sourcePages: number[];
}
export interface FallbackSummary {
  mode: "FALLBACK";
  detailLevel: SummaryDetailLevel;
  notice: string;
  metadata: {
    title: string;
    abstract: string;
    authors: string[];
    publicationDate: string;
  };
  evidence: { section: string; text: string; pages: number[] }[];
  sourcePages: number[];
}
export interface SummaryStatus {
  id: string;
  documentId: string;
  detailLevel: SummaryDetailLevel;
  status: ProcessingStatus;
  mode: AnalysisMode | null;
  model: string | null;
  content: StructuredSummary | FallbackSummary | null;
  failureCode: string | null;
  failureMessage: string | null;
  updatedAt: string;
}
export interface DocumentAnswer {
  answer: string;
  mode: AnalysisMode;
  publication: { id: string; slug: string; title: string };
  evidence: {
    chunkId: string;
    pageStart: number;
    pageEnd: number;
    snippet: string;
  }[];
}
export interface ManagedPublication {
  id: string;
  slug: string;
  title: string;
  workflowStatus: WorkflowStatus;
  reviewNote?: string | null;
}
export const isProcessing = (status?: ProcessingStatus) =>
  status === "PENDING" || status === "PROCESSING";
