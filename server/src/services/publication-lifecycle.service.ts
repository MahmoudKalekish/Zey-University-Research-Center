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
}
export interface LifecycleRepository {
  find: (id: string) => Promise<LifecyclePublication | null>;
  transition: (
    id: string,
    expectedStatus: PublicationWorkflowStatus,
    data: ReturnType<typeof buildPublicationTransitionData>,
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
      return repository.transition(
        id,
        publication.workflowStatus,
        buildPublicationTransitionData(to, new Date(), reviewNote),
      );
    },
  };
}
