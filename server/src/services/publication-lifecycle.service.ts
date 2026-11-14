import type {
  DocumentProcessingStatus,
  PublicationWorkflowStatus,
  Role,
} from "@prisma/client";
import {
  assertPublicationPublishable,
  buildPublicationTransitionData,
  canTransitionPublication,
} from "../domain/publication-workflow.js";
import { HttpError } from "../utils/http.js";

interface LifecyclePublication {
  id: string;
  workflowStatus: PublicationWorkflowStatus;
  document: { status: DocumentProcessingStatus } | null;
  title: string;
  abstract: string;
  keywords: string[];
  authorAttestedAt: Date | null;
  _count: { authors: number; areas: number };
}
export interface LifecycleRepository {
  find: (id: string) => Promise<LifecyclePublication | null>;
  transition: (
    id: string,
    expectedStatus: PublicationWorkflowStatus,
    data: ReturnType<typeof buildPublicationTransitionData> & {
      authorAttestedAt?: Date | null;
    },
  ) => Promise<unknown>;
}

export function createPublicationLifecycleService(
  repository: LifecycleRepository,
) {
  return {
    async transition(
      id: string,
      to: PublicationWorkflowStatus,
      _userId: string,
      role: Role,
      reviewNote?: string,
      confirmed = false,
    ) {
      const publication = await repository.find(id);
      if (!publication) throw new HttpError(404, "Publication not found");
      if (!canTransitionPublication(publication.workflowStatus, to, role)) {
        throw new HttpError(
          role === "VISITOR" ? 403 : 409,
          "This publication lifecycle transition is not allowed",
        );
      }
      if (to === "PUBLISHED") assertPublicationPublishable(publication);
      if (
        to === "READY_FOR_REVIEW" &&
        publication.document?.status !== "READY"
      ) {
        throw new HttpError(
          409,
          "A successfully processed PDF is required before submitting for review",
        );
      }
      if (to === "READY_FOR_REVIEW" || to === "PUBLISHED") {
        if (!confirmed)
          throw new HttpError(422, "Confirm the publication checklist first.");
        if (
          publication.title.trim().length < 3 ||
          publication.abstract.trim().length < 20
        )
          throw new HttpError(
            422,
            "Add a title (at least 3 characters) and a short description (at least 20 characters).",
          );
        if (
          new Set(
            publication.keywords
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean),
          ).size < 1
        )
          throw new HttpError(422, "Enter at least one keyword.");
        if (!publication._count.areas || !publication._count.authors)
          throw new HttpError(
            422,
            "Choose at least one research area and list at least one author.",
          );
        if (to === "PUBLISHED" && !publication.authorAttestedAt)
          throw new HttpError(
            409,
            "Return the publication to draft and collect the author declaration before publishing.",
          );
      }
      return repository.transition(id, publication.workflowStatus, {
        ...buildPublicationTransitionData(to, new Date(), reviewNote),
        ...(to === "READY_FOR_REVIEW"
          ? { authorAttestedAt: new Date() }
          : to === "DRAFT"
            ? { authorAttestedAt: null }
            : {}),
      });
    },
  };
}
