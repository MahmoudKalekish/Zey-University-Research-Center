import express, { type RequestHandler } from "express";
import type { Server } from "node:http";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { errorHandler, notFound } from "../middleware/errors.js";
import { HttpError } from "../utils/http.js";
import { createPublicationDocumentRouter } from "./publication-document.routes.js";

const userMiddleware: RequestHandler = (req, _res, next) => {
  req.user = {
    id: String(req.headers["x-user"] ?? "author"),
    email: "user@zurc.test",
    role: String(req.headers["x-role"] ?? "RESEARCHER") as any,
  };
  next();
};

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          ),
      ),
  );
});

async function setup(overrides: Record<string, unknown> = {}) {
  const dependencies = {
    authenticate: userMiddleware,
    upload: ((req, _res, next) => {
      req.file = {
        originalname: "paper.pdf",
        mimetype: "application/pdf",
        size: 12,
        buffer: Buffer.from("%PDF-1.7\nok"),
      } as Express.Multer.File;
      next();
    }) as RequestHandler,
    requireManager: vi.fn(async (_id: string, userId: string) => {
      if (userId === "outsider")
        throw new HttpError(403, "You may only manage publications you author");
      return { id: "pub-1", workflowStatus: "DRAFT" };
    }),
    replaceDocument: vi.fn(async () => ({
      id: "doc-1",
      publicationId: "pub-1",
      status: "PENDING",
      originalName: "paper.pdf",
      sizeBytes: 12,
      pageCount: null,
      characterCount: null,
      failureCode: null,
      failureMessage: null,
      processedAt: null,
      updatedAt: "2026-10-01T12:00:00.000Z",
    })),
    status: vi.fn(async () => ({
      id: "doc-1",
      publicationId: "pub-1",
      status: "READY",
    })),
    retry: vi.fn(async () => ({ status: "PENDING" })),
    transition: vi.fn(async (_id: string, to: string) => ({
      id: "pub-1",
      workflowStatus: to,
    })),
    createResearcherDraft: vi.fn(async (_userId: string, input: any) => ({
      id: "pub-new",
      workflowStatus: "DRAFT",
      title: input.title,
      authors: [{ researcherId: "researcher-1" }],
    })),
    resolvePublic: vi.fn(async () => ({
      id: "pub-1",
      slug: "paper-one",
      documentId: "doc-1",
    })),
    streamDocument: vi.fn(async (_slug, _userId, res) => res.status(204).end()),
    queueSummary: vi.fn(async (_id: string, level: string) => ({
      id: "summary-1",
      detailLevel: level,
      status: "PENDING",
    })),
    summaryStatus: vi.fn(async () => ({
      id: "summary-1",
      detailLevel: "STANDARD",
      status: "READY",
      content: { inShort: { text: "Summary", pages: [1] } },
    })),
    askQuestion: vi.fn(async () => ({
      answer: "Grounded",
      mode: "FALLBACK",
      publication: { id: "pub-1", slug: "paper-one", title: "Paper One" },
      evidence: [],
    })),
    ...overrides,
  };
  const app = express();
  app.use(express.json());
  app.use(
    "/api/publications",
    createPublicationDocumentRouter(dependencies as any, "public"),
  );
  app.use(
    "/api/admin",
    createPublicationDocumentRouter(dependencies as any, "admin"),
  );
  app.use(
    "/api/researcher",
    createPublicationDocumentRouter(dependencies as any, "researcher"),
  );
  app.use(notFound);
  app.use(errorHandler);
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  servers.push(server);
  return { app: server, dependencies };
}

describe("publication document routes", () => {
  it("uploads a managed PDF asynchronously without leaking a filesystem path", async () => {
    const { app } = await setup();
    const response = await request(app)
      .post("/api/publications/pub-1/document")
      .expect(202);
    expect(response.body.status).toBe("PENDING");
    expect(JSON.stringify(response.body)).not.toMatch(
      /absolutePath|storageKey|\/storage\//,
    );
  });

  it("enforces author policy for upload, replacement, edit, and submit entry points", async () => {
    const { app } = await setup();
    await request(app)
      .post("/api/publications/pub-1/document")
      .set("x-user", "outsider")
      .expect(403);
    await request(app)
      .post("/api/researcher/publications/pub-1/submit")
      .set("x-user", "outsider")
      .expect(403);
  });

  it("supports status, retry, submit, publish, required return note, and archive transitions", async () => {
    const { app, dependencies } = await setup();
    await request(app)
      .get("/api/publications/pub-1/document/status")
      .expect(200);
    await request(app)
      .post("/api/admin/publications/pub-1/document/retry")
      .set("x-role", "ADMIN")
      .expect(202);
    await request(app)
      .post("/api/researcher/publications/pub-1/submit")
      .expect(200);
    await request(app)
      .post("/api/admin/publications/pub-1/publish")
      .set("x-role", "ADMIN")
      .expect(200);
    await request(app)
      .post("/api/admin/publications/pub-1/return")
      .set("x-role", "ADMIN")
      .send({})
      .expect(422);
    await request(app)
      .post("/api/admin/publications/pub-1/return")
      .set("x-role", "ADMIN")
      .send({ reviewNote: "Correct the author order." })
      .expect(200);
    await request(app)
      .post("/api/admin/publications/pub-1/archive")
      .set("x-role", "ADMIN")
      .expect(200);
    expect(dependencies.transition).toHaveBeenCalledWith(
      "pub-1",
      "PUBLISHED",
      "author",
      "ADMIN",
      undefined,
    );
  });

  it("creates a researcher-owned draft with the authenticated researcher as an author", async () => {
    const { app, dependencies } = await setup();
    const response = await request(app)
      .post("/api/researcher/publications")
      .send({
        title: "New Research Paper",
        abstract:
          "A sufficiently detailed abstract for the new research publication.",
        publicationDate: "2026-10-01",
        venue: "ZURC Conference",
        keywords: ["research"],
        type: "CONFERENCE_PAPER",
        areaIds: [],
      })
      .expect(201);
    expect(response.body.workflowStatus).toBe("DRAFT");
    expect(dependencies.createResearcherDraft).toHaveBeenCalledWith(
      "author",
      expect.objectContaining({ title: "New Research Paper" }),
    );
  });

  it("queues detail-level summaries and answers document questions", async () => {
    const { app } = await setup();
    const queued = await request(app)
      .post("/api/publications/paper-one/summary")
      .send({ detailLevel: "DETAILED" })
      .expect(202);
    expect(queued.body.detailLevel).toBe("DETAILED");
    await request(app)
      .get("/api/publications/paper-one/summary?detailLevel=STANDARD")
      .expect(200);
    const answer = await request(app)
      .post("/api/publications/paper-one/ask")
      .send({
        question: "What was found?",
        sessionId: "123e4567-e89b-42d3-a456-426614174000",
      })
      .expect(200);
    expect(answer.body.answer).toBe("Grounded");
  });

  it("locks researcher document uploads after submission and checks access before parsing uploads", async () => {
    const { app, dependencies } = await setup({
      requireManager: vi.fn(async () => ({
        id: "pub-1",
        workflowStatus: "READY_FOR_REVIEW",
      })),
    });
    await request(app).post("/api/publications/pub-1/document").expect(409);
    expect(dependencies.replaceDocument).not.toHaveBeenCalled();
  });

  it("rejects visitors creating drafts or invoking administrator actions", async () => {
    const { app, dependencies } = await setup();
    await request(app)
      .post("/api/researcher/publications")
      .set("x-role", "VISITOR")
      .send({})
      .expect(403);
    await request(app)
      .post("/api/admin/publications/pub-1/publish")
      .expect(403);
    expect(dependencies.createResearcherDraft).not.toHaveBeenCalled();
  });
});
