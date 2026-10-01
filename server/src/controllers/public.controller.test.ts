import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
const db = vi.hoisted(() => {
  const model = () => ({
    findMany: vi.fn(async () => []),
    count: vi.fn(async () => 0),
    findUniqueOrThrow: vi.fn(async () => ({
      id: "publication",
      document: null,
    })),
  });
  return {
    publication: model(),
    researcher: model(),
    project: model(),
    researchArea: model(),
    event: model(),
    news: model(),
    aiConversation: { upsert: vi.fn(async () => ({ id: "session" })) },
    aiMessage: { createMany: vi.fn() },
  };
});
vi.mock("../config/db.js", () => ({ prisma: db }));
import * as controller from "./public.controller.js";
import { globalSearch } from "../services/search.service.js";
import { askResearchAssistant } from "../services/ai.service.js";

const req = { query: {}, params: { slug: "paper" } } as unknown as Request;
const response = () => ({ json: vi.fn() }) as unknown as Response;
beforeEach(() => vi.clearAllMocks());
describe("public publication visibility", () => {
  it("filters home publication statistics and recent work", async () => {
    await controller.home(req, response());
    expect(db.publication.count).toHaveBeenCalledWith({
      where: { workflowStatus: "PUBLISHED" },
    });
    expect(db.publication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workflowStatus: "PUBLISHED" } }),
    );
  });
  it("filters both catalogue items and totals", async () => {
    await controller.publications(req, response());
    expect(db.publication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workflowStatus: "PUBLISHED" }),
      }),
    );
    expect(db.publication.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ workflowStatus: "PUBLISHED" }),
    });
  });
  it("filters direct detail and exposes safe metadata-only document capabilities", async () => {
    const res = response();
    await controller.publication(req, res);
    expect(db.publication.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "paper", workflowStatus: "PUBLISHED" },
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        documentCapabilities: {
          canRead: false,
          canSummarize: false,
          canAsk: false,
        },
      }),
    );
    expect(
      JSON.stringify(db.publication.findUniqueOrThrow.mock.calls),
    ).not.toMatch(/storageKey|sha256/);
  });
  it("filters researcher and project publication relationships", async () => {
    await controller.researcher(req, response());
    await controller.project(req, response());
    expect(db.researcher.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          publications: expect.objectContaining({
            where: { publication: { workflowStatus: "PUBLISHED" } },
          }),
        }),
      }),
    );
    expect(db.project.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          publications: expect.objectContaining({
            where: { workflowStatus: "PUBLISHED" },
          }),
        }),
      }),
    );
  });
  it("filters global search and center assistant statistics and fallback catalogues", async () => {
    await globalSearch("leaks");
    expect(db.publication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workflowStatus: "PUBLISHED" }),
      }),
    );
    await askResearchAssistant("How many publications?", "session");
    expect(db.publication.count).toHaveBeenCalledWith({
      where: { workflowStatus: "PUBLISHED" },
    });
    vi.clearAllMocks();
    await askResearchAssistant("List publications", "session");
    for (const [query] of db.publication.findMany.mock
      .calls as unknown as Array<[{ where?: unknown }]>)
      expect(query.where).toMatchObject({ workflowStatus: "PUBLISHED" });
  });
  it("filters relationship counts in area, researcher and project catalogues", async () => {
    await controller.areas(req, response());
    await controller.researchers(req, response());
    await controller.projects(req, response());
    expect(db.researchArea.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          _count: {
            select: expect.objectContaining({
              publications: {
                where: { publication: { workflowStatus: "PUBLISHED" } },
              },
            }),
          },
        },
      }),
    );
    expect(db.researcher.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          _count: {
            select: expect.objectContaining({
              publications: {
                where: { publication: { workflowStatus: "PUBLISHED" } },
              },
            }),
          },
        }),
      }),
    );
    expect(db.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          _count: {
            select: {
              publications: { where: { workflowStatus: "PUBLISHED" } },
            },
          },
        }),
      }),
    );
  });
});
