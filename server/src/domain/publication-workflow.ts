import type {
  DocumentProcessingStatus,
  PublicationWorkflowStatus,
  Role,
} from "@prisma/client";
import { HttpError } from "../utils/http.js";

const ADMIN_TRANSITIONS: Record<
  PublicationWorkflowStatus,
  PublicationWorkflowStatus[]
> = {
  DRAFT: ["READY_FOR_REVIEW"],
  READY_FOR_REVIEW: ["DRAFT", "PUBLISHED"],
  PUBLISHED: ["ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

export function canTransitionPublication(
  from: PublicationWorkflowStatus,
  to: PublicationWorkflowStatus,
  role: Role,
) {
  if (role === "RESEARCHER")
    return from === "DRAFT" && to === "READY_FOR_REVIEW";
  if (role !== "ADMIN") return false;
  return ADMIN_TRANSITIONS[from].includes(to);
}

export function assertPublicationPublishable(publication: {
  workflowStatus: PublicationWorkflowStatus;
  document: { status: DocumentProcessingStatus } | null;
}) {
  if (publication.workflowStatus !== "READY_FOR_REVIEW") {
    throw new HttpError(
      409,
      "The publication must be ready for review before it can be published",
    );
  }
  if (publication.document?.status !== "READY") {
    throw new HttpError(
      409,
      "A successfully processed PDF is required before publication",
    );
  }
}

export function assertResearcherCanEdit(
  workflowStatus: PublicationWorkflowStatus,
) {
  if (workflowStatus !== "DRAFT") {
    throw new HttpError(
      409,
      "This publication must be returned to draft before a researcher can edit it",
    );
  }
}

export function buildPublicationTransitionData(
  to: PublicationWorkflowStatus,
  now: Date,
  reviewNote?: string,
) {
  if (to === "READY_FOR_REVIEW") {
    return {
      workflowStatus: to,
      submittedAt: now,
      reviewedAt: null,
      reviewNote: null,
    };
  }
  if (to === "DRAFT") {
    return {
      workflowStatus: to,
      submittedAt: null,
      publishedAt: null,
      archivedAt: null,
      reviewedAt: now,
      reviewNote: reviewNote ?? null,
    };
  }
  if (to === "PUBLISHED") {
    return {
      workflowStatus: to,
      publishedAt: now,
      archivedAt: null,
      reviewedAt: now,
      reviewNote: null,
    };
  }
  return {
    workflowStatus: to,
    archivedAt: now,
    reviewedAt: now,
    reviewNote: reviewNote ?? null,
  };
}
