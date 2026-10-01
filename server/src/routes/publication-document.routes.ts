import {
  Router,
  type NextFunction,
  type RequestHandler,
  type Response,
} from "express";
import type { Role, SummaryDetailLevel } from "@prisma/client";
import { assertResearcherCanEdit } from "../domain/publication-workflow.js";
import type { requirePublicationManager } from "../services/publication-access.service.js";
import type {
  getDocumentStatus,
  replacePublicationDocument,
} from "../services/documents/document.service.js";
import type { answerDocumentQuestion } from "../services/documents/question.service.js";
import type { queueSummary } from "../services/documents/summary.service.js";
import { publicationDocumentDependencies as defaultDependencies } from "../services/publication-document.dependencies.js";
import { asyncHandler, HttpError } from "../utils/http.js";
import {
  documentQuestionSchema,
  publicationReturnSchema,
  researcherPublicationDraftSchema,
  summaryRequestSchema,
} from "../validation/schemas.js";

type Scope = "public" | "admin" | "researcher";

export interface RouteDependencies {
  authenticate: RequestHandler;
  upload: RequestHandler;
  requireManager: typeof requirePublicationManager;
  replaceDocument: typeof replacePublicationDocument;
  status: typeof getDocumentStatus;
  retry: (publicationId: string) => Promise<unknown>;
  transition: (
    publicationId: string,
    to: "DRAFT" | "READY_FOR_REVIEW" | "PUBLISHED" | "ARCHIVED",
    userId: string,
    role: Role,
    reviewNote?: string,
  ) => Promise<unknown>;
  createResearcherDraft: (userId: string, input: unknown) => Promise<unknown>;
  resolvePublic: (
    slug: string,
    userId?: string,
  ) => Promise<{ id: string; slug: string; documentId: string }>;
  streamDocument: (
    slug: string,
    userId: string | undefined,
    response: Response,
    next: NextFunction,
  ) => Promise<void>;
  queueSummary: typeof queueSummary;
  summaryStatus: (
    documentId: string,
    level: SummaryDetailLevel,
  ) => Promise<unknown>;
  askQuestion: typeof answerDocumentQuestion;
}

const requireUser = (request: Express.Request) => {
  if (!request.user) throw new HttpError(401, "Authentication required");
  return request.user;
};

export function createPublicationDocumentRouter(
  dependencies: RouteDependencies = defaultDependencies,
  scope: Scope = "public",
) {
  const router = Router();
  if (scope === "public") {
    router.post(
      "/:id/document",
      dependencies.authenticate,
      asyncHandler(async (request, _response, next) => {
        const user = requireUser(request);
        const publication = await dependencies.requireManager(
          String(request.params.id),
          user.id,
        );
        if (user.role !== "ADMIN")
          assertResearcherCanEdit(publication.workflowStatus);
        next();
      }),
      dependencies.upload,
      asyncHandler(async (request, response) => {
        if (!request.file)
          throw new HttpError(422, "Upload one PDF in the document field");
        response
          .status(202)
          .json(
            await dependencies.replaceDocument(
              String(request.params.id),
              request.file,
            ),
          );
      }),
    );
    router.get(
      "/:id/document/status",
      dependencies.authenticate,
      asyncHandler(async (request, response) => {
        const user = requireUser(request);
        await dependencies.requireManager(String(request.params.id), user.id);
        response.json(await dependencies.status(String(request.params.id)));
      }),
    );
    router.get(
      "/:slug/document",
      asyncHandler(async (request, response, next) => {
        await dependencies.streamDocument(
          String(request.params.slug),
          request.user?.id,
          response,
          next,
        );
      }),
    );
    router.post(
      "/:slug/summary",
      asyncHandler(async (request, response) => {
        const { detailLevel } = summaryRequestSchema.parse(request.body);
        const publication = await dependencies.resolvePublic(
          String(request.params.slug),
          request.user?.id,
        );
        const summary = await dependencies.queueSummary(
          publication.documentId,
          detailLevel,
        );
        response.status(summary.status === "READY" ? 200 : 202).json(summary);
      }),
    );
    router.get(
      "/:slug/summary",
      asyncHandler(async (request, response) => {
        const { detailLevel } = summaryRequestSchema.parse(request.query);
        const publication = await dependencies.resolvePublic(
          String(request.params.slug),
          request.user?.id,
        );
        response.json(
          await dependencies.summaryStatus(publication.documentId, detailLevel),
        );
      }),
    );
    router.post(
      "/:slug/ask",
      asyncHandler(async (request, response) => {
        const input = documentQuestionSchema.parse(request.body);
        response.json(
          await dependencies.askQuestion(
            String(request.params.slug),
            input.question,
            {
              sessionId: input.sessionId,
              userId: request.user?.id,
              canManage:
                request.user?.role === "ADMIN" ||
                request.user?.role === "RESEARCHER",
            },
          ),
        );
      }),
    );
  }

  if (scope === "researcher") {
    router.post(
      "/publications",
      dependencies.authenticate,
      asyncHandler(async (request, response) => {
        const user = requireUser(request);
        if (user.role !== "RESEARCHER" && user.role !== "ADMIN")
          throw new HttpError(403, "Researcher access required");
        const input = researcherPublicationDraftSchema.parse(request.body);
        response
          .status(201)
          .json(await dependencies.createResearcherDraft(user.id, input));
      }),
    );
    router.post(
      "/publications/:id/submit",
      dependencies.authenticate,
      asyncHandler(async (request, response) => {
        const user = requireUser(request);
        await dependencies.requireManager(String(request.params.id), user.id);
        response.json(
          await dependencies.transition(
            String(request.params.id),
            "READY_FOR_REVIEW",
            user.id,
            user.role,
          ),
        );
      }),
    );
  }

  if (scope === "admin") {
    const adminAction = (
      to: "DRAFT" | "READY_FOR_REVIEW" | "PUBLISHED" | "ARCHIVED",
      needsNote = false,
    ) =>
      [
        dependencies.authenticate,
        asyncHandler(async (request, response) => {
          const user = requireUser(request);
          if (user.role !== "ADMIN")
            throw new HttpError(403, "Administrator access required");
          await dependencies.requireManager(String(request.params.id), user.id);
          const reviewNote = needsNote
            ? publicationReturnSchema.parse(request.body).reviewNote
            : undefined;
          response.json(
            await dependencies.transition(
              String(request.params.id),
              to,
              user.id,
              user.role,
              reviewNote,
            ),
          );
        }),
      ] as RequestHandler[];
    router.post(
      "/publications/:id/document/retry",
      dependencies.authenticate,
      asyncHandler(async (request, response) => {
        const user = requireUser(request);
        if (user.role !== "ADMIN")
          throw new HttpError(403, "Administrator access required");
        await dependencies.requireManager(String(request.params.id), user.id);
        response
          .status(202)
          .json(await dependencies.retry(String(request.params.id)));
      }),
    );
    router.post("/publications/:id/submit", ...adminAction("READY_FOR_REVIEW"));
    router.post("/publications/:id/publish", ...adminAction("PUBLISHED"));
    router.post("/publications/:id/return", ...adminAction("DRAFT", true));
    router.post("/publications/:id/archive", ...adminAction("ARCHIVED"));
  }
  return router;
}

export const publicationDocumentRouter = createPublicationDocumentRouter();
export const adminPublicationDocumentRouter = createPublicationDocumentRouter(
  defaultDependencies,
  "admin",
);
export const researcherPublicationDocumentRouter =
  createPublicationDocumentRouter(defaultDependencies, "researcher");
