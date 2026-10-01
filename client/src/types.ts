import type {
  WorkflowStatus,
  DocumentStatus,
} from "./types/publication-document";
export type Area = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  objectives: string[];
  _count?: Record<string, number>;
};
export type Researcher = {
  id: string;
  name: string;
  slug: string;
  biography: string;
  position: string;
  email: string;
  affiliation: string;
  photoUrl?: string;
  interests: string[];
  areas: { area: Area }[];
  _count?: Record<string, number>;
};
export type Project = {
  id: string;
  title: string;
  slug: string;
  description: string;
  abstract: string;
  objectives?: string[];
  status: string;
  startDate: string;
  endDate?: string;
  funding?: string;
  areas: { area: Area }[];
  researchers: { researcher: Researcher; role?: string }[];
  _count?: Record<string, number>;
};
export type Publication = {
  workflowStatus: WorkflowStatus;
  reviewNote?: string | null;
  document?: Pick<
    DocumentStatus,
    "id" | "status" | "originalName" | "sizeBytes" | "pageCount"
  > | null;
  documentCapabilities?: {
    canRead: boolean;
    canSummarize: boolean;
    canAsk: boolean;
  };
  id: string;
  title: string;
  slug: string;
  abstract: string;
  publicationDate: string;
  doi?: string;
  venue: string;
  keywords: string[];
  type: string;
  pdfUrl?: string;
  externalUrl?: string;
  authors: { researcher: Researcher; authorOrder: number }[];
  areas: { area: Area }[];
  project?: Project;
};
export type Page<T> = {
  items: T[];
  meta: { page: number; pages: number; total: number; limit: number };
};
