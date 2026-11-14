import { randomUUID } from "node:crypto";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./config/db.js";
import { env } from "./config/env.js";
import { app } from "./app.js";
import {
  processNextDocument,
  recoverInterruptedJobs,
} from "./services/documents/worker.service.js";
import { processNextSummary } from "./services/documents/summary.service.js";
import { resolveStoragePath } from "./services/documents/storage.service.js";
import { createPdf } from "../test/fixtures/pdf.js";

const enabled = process.env.ZURC_DOCUMENT_ACCEPTANCE === "1";
if (
  enabled &&
  !/^\/zurc_publication_test_[a-z0-9_]+$/.test(
    new URL(env.DATABASE_URL).pathname,
  )
) {
  throw new Error(
    "Acceptance tests require a dedicated zurc_publication_test_* database.",
  );
}
describe.skipIf(!enabled)(
  "publication document database and HTTP acceptance",
  () => {
    const suffix = randomUUID();
    let storage: string;
    let authorId: string;
    let authorToken: string;
    let outsiderToken: string;
    let adminToken: string;
    let visitorToken: string;
    let areaId: string;
    let publicationId: string;
    let slug: string;
    const previousStorage = env.PUBLICATION_STORAGE_DIR;
    const previousOllama = env.OLLAMA_URL;
    const tokens: string[] = [];
    const sessions: string[] = [];
    const paper = createPdf([
      "Introduction\nObjective: Evaluate water sensor leak detection on campus.",
      "Methods\nResearchers installed 12 sensors and observed them for 30 days.",
      "Results\nThe sensors detected 9 of 10 confirmed leaks. Two alerts were false alarms.",
      "Conclusion\nSensors helped detect leaks.\n\nLimitations\nThe study evaluated one campus for only 30 days. FINAL-PAGE-MARKER",
    ]);
    beforeAll(async () => {
      storage = await mkdtemp(path.join(tmpdir(), "zurc-acceptance-"));
      env.PUBLICATION_STORAGE_DIR = storage;
      env.OLLAMA_URL = "http://127.0.0.1:9";
      areaId = (
        await prisma.researchArea.create({
          data: {
            name: `Acceptance area ${suffix}`,
            slug: `acceptance-${suffix}`,
            description: "Test",
            icon: "AI",
            objectives: [],
          },
        })
      ).id;
      for (const role of [
        "ADMIN",
        "RESEARCHER",
        "RESEARCHER",
        "VISITOR",
      ] as const) {
        const user = await prisma.user.create({
          data: {
            email: `${role}-${tokens.length}-${suffix}@zurc.test`,
            passwordHash: "test-only-not-a-login",
            firstName: "Test",
            lastName: role,
            role,
          },
        });
        tokens.push(user.id);
        const token = jwt.sign(
          { id: user.id, role, email: user.email },
          env.JWT_SECRET,
        );
        if (role === "ADMIN") adminToken = token;
        else if (role === "VISITOR") visitorToken = token;
        else {
          const profile = await prisma.researcher.create({
            data: {
              userId: user.id,
              name: "Acceptance researcher",
              slug: `researcher-${user.id}`,
              email: user.email,
              biography: "Original test profile",
              position: "Researcher",
              affiliation: "ZURC",
              interests: [],
            },
          });
          if (!authorToken) {
            authorToken = token;
            authorId = profile.id;
          } else outsiderToken = token;
        }
      }
    });
    afterAll(async () => {
      if (publicationId)
        await prisma.publication.deleteMany({ where: { id: publicationId } });
      await prisma.aiConversation.deleteMany({
        where: { sessionId: { in: sessions } },
      });
      await prisma.researcher.deleteMany({ where: { userId: { in: tokens } } });
      await prisma.user.deleteMany({ where: { id: { in: tokens } } });
      await prisma.researchArea.deleteMany({ where: { id: areaId } });
      await prisma.$disconnect();
      env.PUBLICATION_STORAGE_DIR = previousStorage;
      env.OLLAMA_URL = previousOllama;
      if (storage) await rm(storage, { recursive: true, force: true });
    });
    it("requires a complete application, protects the review queue, and grants access only after verification", async () => {
      const body = {
        category: "STUDENT",
        institution: "Acceptance University",
        department: "Engineering",
        areaId,
        proposal:
          "I will study campus flood monitoring by comparing water level sensors across different locations and publishing the results.",
        experience:
          "I am studying engineering and have completed a project on campus data collection and sensor validation.",
        benefit:
          "Campus staff can use the research to decide where to place sensors for earlier warnings.",
        keywords: ["flood monitoring", "sensors", "early warning"],
        consent: true,
      };
      const visitor = await prisma.user.findFirstOrThrow({
        where: { id: { in: tokens }, role: "VISITOR" },
      });
      const payload = { ...body, institutionalEmail: visitor.email };
      await request(app)
        .post("/api/researcher-applications")
        .send(payload)
        .expect(401);
      await request(app)
        .post("/api/researcher-applications")
        .auth(visitorToken, { type: "bearer" })
        .send({ ...payload, benefit: "" })
        .expect(422);
      await request(app)
        .post("/api/researcher-applications")
        .auth(visitorToken, { type: "bearer" })
        .send(payload)
        .expect(201);
      await request(app)
        .post("/api/researcher-applications")
        .auth(visitorToken, { type: "bearer" })
        .send(payload)
        .expect(409);
      await request(app)
        .get("/api/admin/researcher-applications")
        .auth(visitorToken, { type: "bearer" })
        .expect(403);
      const mine = await request(app)
        .get("/api/researcher-applications/me")
        .auth(visitorToken, { type: "bearer" })
        .expect(200);
      expect(mine.body).toMatchObject({ status: "PENDING" });
      expect(mine.body).not.toHaveProperty("institutionalReference");
      const queue = await request(app)
        .get("/api/admin/researcher-applications?q=flood%20monitoring")
        .auth(adminToken, { type: "bearer" })
        .expect(200);
      const application = queue.body.items.find(
        (item: { userId: string }) => item.userId === visitor.id,
      );
      expect(application).not.toHaveProperty("institutionalReference");
      const review = `/api/admin/researcher-applications/${application.id}/review`;
      await request(app)
        .post(review)
        .auth(adminToken, { type: "bearer" })
        .send({
          decision: "APPROVED",
          verified: false,
          note: "Verification not yet complete",
        })
        .expect(422);
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: visitor.id } }))
          .role,
      ).toBe("VISITOR");
      await request(app)
        .post(review)
        .auth(adminToken, { type: "bearer" })
        .send({
          decision: "APPROVED",
          verified: true,
          note: "Confirmed through the institution's official registrar.",
        })
        .expect(200);
      const profile = await request(app)
        .get("/api/researcher/me")
        .auth(visitorToken, { type: "bearer" })
        .expect(200);
      expect(profile.body.areas[0].areaId).toBe(areaId);
      expect(
        (
          await prisma.researcherApplication.findUniqueOrThrow({
            where: { id: application.id },
          })
        ).institutionalReference,
      ).toBe("");
      // Use a different visitor for document authorization checks after this promotion.
      const another = await prisma.user.create({
        data: {
          email: `reader-${suffix}@zurc.test`,
          passwordHash: "test-only-not-a-login",
          firstName: "Test",
          lastName: "Reader",
          role: "VISITOR",
        },
      });
      tokens.push(another.id);
      visitorToken = jwt.sign(
        { id: another.id, email: another.email, role: "VISITOR" },
        env.JWT_SECRET,
      );
    });
    it("enforces author ownership, readiness, review, public visibility, fallback analysis, replacement and deletion", async () => {
      const draft = await request(app)
        .post("/api/researcher/publications")
        .auth(authorToken, { type: "bearer" })
        .send({
          title: `Acceptance water sensors ${suffix}`,
          abstract:
            "An original study evaluating campus water sensor leak detection by testing the sensors and reporting their performance.",
          publicationDate: "2026-10-01",
          venue: "ZURC Test",
          keywords: ["sensors", "leaks", "campus"],
          type: "REPORT",
          areaIds: [areaId],
        })
        .expect(201);
      publicationId = draft.body.id;
      slug = draft.body.slug;
      expect(draft.body.authors[0].researcherId).toBe(authorId);
      expect(draft.body.workflowStatus).toBe("DRAFT");
      await request(app)
        .post(`/api/researcher/publications/${publicationId}/submit`)
        .send({ confirmed: true })
        .auth(authorToken, { type: "bearer" })
        .expect(409);
      await request(app).get(`/api/publications/${slug}`).expect(404);
      await request(app)
        .post(`/api/publications/${publicationId}/document`)
        .auth(outsiderToken, { type: "bearer" })
        .attach("document", paper, {
          filename: "paper.pdf",
          contentType: "application/pdf",
        })
        .expect(403);
      await request(app)
        .put(`/api/researcher/publications/${publicationId}`)
        .auth(outsiderToken, { type: "bearer" })
        .send({ title: "Unauthorized edit" })
        .expect(403);
      await request(app)
        .post(`/api/publications/${publicationId}/document`)
        .auth(authorToken, { type: "bearer" })
        .attach("document", Buffer.from("not a PDF"), {
          filename: "fake.pdf",
          contentType: "application/pdf",
        })
        .expect(415);
      expect(
        await prisma.publicationDocument.count({ where: { publicationId } }),
      ).toBe(0);
      await request(app)
        .post(`/api/publications/${publicationId}/document`)
        .auth(authorToken, { type: "bearer" })
        .attach("document", paper, {
          filename: "paper.pdf",
          contentType: "application/pdf",
        })
        .expect(202);
      expect(await processNextDocument()).toBe(true);
      const document = await prisma.publicationDocument.findUniqueOrThrow({
        where: { publicationId },
        include: { chunks: true },
      });
      expect(document.status).toBe("READY");
      expect(document.pageCount).toBe(4);
      expect(
        document.chunks.some((chunk) =>
          chunk.content.includes("FINAL-PAGE-MARKER"),
        ),
      ).toBe(true);
      await prisma.publicationDocument.update({
        where: { id: document.id },
        data: { status: "PROCESSING" },
      });
      expect(await recoverInterruptedJobs()).toBe(1);
      await processNextDocument();
      expect(
        await prisma.documentChunk.count({
          where: { documentId: document.id },
        }),
      ).toBe(document.chunks.length);
      await request(app)
        .post(`/api/researcher/publications/${publicationId}/submit`)
        .send({ confirmed: true })
        .auth(authorToken, { type: "bearer" })
        .expect(200);
      await request(app)
        .post(`/api/publications/${publicationId}/document`)
        .auth(authorToken, { type: "bearer" })
        .attach("document", paper, {
          filename: "locked.pdf",
          contentType: "application/pdf",
        })
        .expect(409);
      await request(app)
        .post(`/api/admin/publications/${publicationId}/publish`)
        .send({ confirmed: true })
        .auth(authorToken, { type: "bearer" })
        .expect(403);
      await request(app)
        .post(`/api/publications/${slug}/ask`)
        .auth(outsiderToken, { type: "bearer" })
        .send({
          question: "What results were reported?",
          sessionId: randomUUID(),
        })
        .expect(403);
      await request(app)
        .post(`/api/admin/publications/${publicationId}/publish`)
        .send({ confirmed: true })
        .auth(adminToken, { type: "bearer" })
        .expect(200);
      for (const [verb, action] of [
        ["get", "document"],
        ["get", "summary"],
        ["post", "summary"],
        ["post", "ask"],
      ] as const) {
        const body =
          action === "ask"
            ? { question: "What did the study find?", sessionId: randomUUID() }
            : {};
        const url = `/api/publications/${slug}/${action}`;
        const send = () => request(app)[verb](url);
        await send().send(body).expect(401);
        await send()
          .auth(visitorToken, { type: "bearer" })
          .send(body)
          .expect(403);
      }
      const publicDetail = await request(app)
        .get(`/api/publications/${slug}`)
        .expect(200);
      expect(publicDetail.body.documentRestricted).toBe(true);
      expect(publicDetail.body.document).toBeNull();
      const detail = await request(app)
        .get(`/api/publications/${slug}`)
        .auth(outsiderToken, { type: "bearer" })
        .expect(200);
      expect(detail.body.documentCapabilities).toEqual({
        canRead: true,
        canSummarize: true,
        canAsk: true,
      });
      const pdf = await request(app)
        .get(`/api/publications/${slug}/document`)
        .auth(outsiderToken, { type: "bearer" })
        .expect(200);
      expect(pdf.headers["content-type"]).toContain("application/pdf");
      expect(pdf.headers["x-content-type-options"]).toBe("nosniff");
      await request(app)
        .post(`/api/publications/${slug}/summary`)
        .auth(authorToken, { type: "bearer" })
        .send({ detailLevel: "STANDARD" })
        .expect(202);
      await processNextSummary();
      const summary = await request(app)
        .get(`/api/publications/${slug}/summary?detailLevel=STANDARD`)
        .auth(authorToken, { type: "bearer" })
        .expect(200);
      expect(summary.body.mode).toBe("FALLBACK");
      expect(summary.body.content.sourcePages).toContain(4);
      const retry = await request(app)
        .post(`/api/publications/${slug}/summary`)
        .auth(authorToken, { type: "bearer" })
        .send({ detailLevel: "STANDARD" })
        .expect(202);
      expect(retry.body).toMatchObject({
        id: summary.body.id,
        status: "PENDING",
        mode: null,
      });
      sessions.push(randomUUID());
      const answer = await request(app)
        .post(`/api/publications/${slug}/ask`)
        .auth(authorToken, { type: "bearer" })
        .send({
          question: "What confirmed leaks were detected?",
          sessionId: sessions[0],
        })
        .expect(200);
      expect(answer.body.mode).toBe("FALLBACK");
      expect(
        answer.body.evidence.some(
          (item: { pageStart: number }) => item.pageStart === 3,
        ),
      ).toBe(true);
      await request(app)
        .post(`/api/admin/publications/${publicationId}/archive`)
        .auth(adminToken, { type: "bearer" })
        .expect(200);
      await request(app)
        .get(`/api/publications/${slug}/document`)
        .auth(outsiderToken, { type: "bearer" })
        .expect(403);
      await request(app)
        .get(`/api/publications/${slug}/summary`)
        .auth(outsiderToken, { type: "bearer" })
        .expect(403);
      await request(app)
        .get(`/api/publications?q=${encodeURIComponent(suffix)}`)
        .expect(200)
        .then((result) => expect(result.body.items).toHaveLength(0));
      await request(app)
        .post(`/api/admin/publications/${publicationId}/return`)
        .auth(adminToken, { type: "bearer" })
        .send({ reviewNote: "Test re-review" })
        .expect(200);
      await request(app)
        .post(`/api/publications/${publicationId}/document`)
        .auth(authorToken, { type: "bearer" })
        .attach("document", Buffer.from("%PDF-1.7\ncorrupt"), {
          filename: "corrupt.pdf",
          contentType: "application/pdf",
        })
        .expect(202);
      await processNextDocument();
      expect(
        await prisma.publicationDocument.findUniqueOrThrow({
          where: { publicationId },
        }),
      ).toMatchObject({
        status: "FAILED",
        failureCode: "CORRUPT_OR_ENCRYPTED_PDF",
      });
      await request(app)
        .post(`/api/publications/${publicationId}/document`)
        .auth(authorToken, { type: "bearer" })
        .attach("document", createPdf(["", ""]), {
          filename: "scanned.pdf",
          contentType: "application/pdf",
        })
        .expect(202);
      await processNextDocument();
      expect(
        await prisma.publicationDocument.findUniqueOrThrow({
          where: { publicationId },
        }),
      ).toMatchObject({ status: "FAILED", failureCode: "OCR_REQUIRED" });
      await request(app)
        .post(`/api/publications/${publicationId}/document`)
        .auth(authorToken, { type: "bearer" })
        .attach("document", paper, {
          filename: "restored.pdf",
          contentType: "application/pdf",
        })
        .expect(202);
      await processNextDocument();
      await request(app)
        .post(`/api/researcher/publications/${publicationId}/submit`)
        .send({ confirmed: true })
        .auth(authorToken, { type: "bearer" })
        .expect(200);
      await request(app)
        .post(`/api/admin/publications/${publicationId}/publish`)
        .send({ confirmed: true })
        .auth(adminToken, { type: "bearer" })
        .expect(200);
      await request(app)
        .post(`/api/publications/${publicationId}/document`)
        .auth(adminToken, { type: "bearer" })
        .attach("document", paper, {
          filename: "replacement.pdf",
          contentType: "application/pdf",
        })
        .expect(202);
      const replacement = await prisma.publicationDocument.findUniqueOrThrow({
        where: { publicationId },
      });
      expect(replacement.id).not.toBe(document.id);
      expect(
        await prisma.publicationSummary.count({
          where: { documentId: document.id },
        }),
      ).toBe(0);
      await expect(
        stat(resolveStoragePath(document.storageKey)),
      ).rejects.toMatchObject({ code: "ENOENT" });
      await request(app).get(`/api/publications/${slug}`).expect(404);
      await request(app)
        .delete(`/api/admin/publications/${publicationId}`)
        .auth(adminToken, { type: "bearer" })
        .expect(204);
      await expect(
        stat(resolveStoragePath(replacement.storageKey)),
      ).rejects.toMatchObject({ code: "ENOENT" });
    }, 30000);
  },
);
