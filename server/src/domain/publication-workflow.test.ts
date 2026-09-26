import { describe, expect, it } from "vitest";
import {
  assertPublicationPublishable,
  buildPublicationTransitionData,
  canTransitionPublication,
} from "./publication-workflow.js";

describe("publication workflow", () => {
  it("allows researchers to submit drafts but not publish them", () => {
    expect(canTransitionPublication("DRAFT", "READY_FOR_REVIEW", "RESEARCHER")).toBe(true);
    expect(canTransitionPublication("READY_FOR_REVIEW", "PUBLISHED", "RESEARCHER")).toBe(false);
  });

  it("reserves review, publication, return, and archive transitions for administrators", () => {
    expect(canTransitionPublication("DRAFT", "READY_FOR_REVIEW", "ADMIN")).toBe(true);
    expect(canTransitionPublication("READY_FOR_REVIEW", "PUBLISHED", "ADMIN")).toBe(true);
    expect(canTransitionPublication("READY_FOR_REVIEW", "DRAFT", "ADMIN")).toBe(true);
    expect(canTransitionPublication("PUBLISHED", "ARCHIVED", "ADMIN")).toBe(true);
    expect(canTransitionPublication("ARCHIVED", "DRAFT", "ADMIN")).toBe(true);
  });

  it("rejects invalid lifecycle jumps", () => {
    expect(canTransitionPublication("DRAFT", "PUBLISHED", "ADMIN")).toBe(false);
    expect(canTransitionPublication("DRAFT", "ARCHIVED", "RESEARCHER")).toBe(false);
    expect(canTransitionPublication("PUBLISHED", "READY_FOR_REVIEW", "ADMIN")).toBe(false);
  });

  it("requires a ready document and review state before publication", () => {
    expect(() =>
      assertPublicationPublishable({
        workflowStatus: "READY_FOR_REVIEW",
        document: { status: "READY" },
      }),
    ).not.toThrow();
    expect(() =>
      assertPublicationPublishable({ workflowStatus: "DRAFT", document: { status: "READY" } }),
    ).toThrow(/ready for review/i);
    expect(() =>
      assertPublicationPublishable({ workflowStatus: "READY_FOR_REVIEW", document: null }),
    ).toThrow(/processed PDF/i);
    expect(() =>
      assertPublicationPublishable({
        workflowStatus: "READY_FOR_REVIEW",
        document: { status: "FAILED" },
      }),
    ).toThrow(/processed PDF/i);
  });

  it("builds deterministic timestamp and review-note resets", () => {
    const now = new Date("2026-09-26T12:00:00.000Z");
    expect(buildPublicationTransitionData("READY_FOR_REVIEW", now)).toEqual({
      workflowStatus: "READY_FOR_REVIEW",
      submittedAt: now,
      reviewedAt: null,
      reviewNote: null,
    });
    expect(buildPublicationTransitionData("DRAFT", now, "Correct the author order.")).toEqual({
      workflowStatus: "DRAFT",
      submittedAt: null,
      publishedAt: null,
      archivedAt: null,
      reviewedAt: now,
      reviewNote: "Correct the author order.",
    });
    expect(buildPublicationTransitionData("PUBLISHED", now)).toEqual({
      workflowStatus: "PUBLISHED",
      publishedAt: now,
      archivedAt: null,
      reviewedAt: now,
      reviewNote: null,
    });
  });
});
