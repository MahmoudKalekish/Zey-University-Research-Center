import { describe, expect, it, vi } from "vitest";
import { LocalGenerationError } from "./ollama.service.js";
import { createSummaryEngine, buildSummaryFallback, createSummaryJobService } from "./summary.service.js";

const publication = {
  title: "Complete Paper",
  abstract: "Metadata abstract about resilient urban systems.",
  authors: ["Ada Researcher"],
  publicationDate: "2026-01-10",
};

const chunks = [
  { chunkIndex: 0, pageStart: 1, pageEnd: 1, sectionTitle: "Introduction", content: `FIRST-MARKER ${"context ".repeat(500)}` },
  { chunkIndex: 1, pageStart: 4, pageEnd: 5, sectionTitle: "Methods", content: `MIDDLE-MARKER The researchers surveyed 420 participants. ${"method ".repeat(500)}` },
  { chunkIndex: 2, pageStart: 8, pageEnd: 9, sectionTitle: "Results", content: `LATE-RESULT-MARKER The reported accuracy was 91 percent. ${"result ".repeat(500)}` },
  { chunkIndex: 3, pageStart: 12, pageEnd: 12, sectionTitle: "Conclusion", content: `FINAL-MARKER The authors conclude the method improved detection. ${"conclusion ".repeat(500)}` },
];

const finalOutput = {
  inShort: { text: "The study evaluates detection and reports improved performance.", pages: [1, 8, 12] },
  researchObjective: { text: "Evaluate resilient detection.", pages: [1] },
  methodology: { text: "The researchers surveyed 420 participants.", pages: [4, 5] },
  keyFindings: { text: "The reported accuracy was 91 percent.", pages: [8, 9] },
  conclusions: { text: "The authors conclude that detection improved.", pages: [12] },
  limitations: { text: "Not stated in the document", pages: [] },
  whyItMatters: { text: "It may support reliable detection.", pages: [12] },
  keywords: ["detection", "resilience"],
};

describe("full-document hierarchical summaries", () => {
  it("maps every chunk batch before synthesizing later methods/results evidence", async () => {
    const prompts: string[] = [];
    const generate = vi.fn(async (prompt: string) => {
      prompts.push(prompt);
      if (prompt.startsWith("FINAL_SYNTHESIS")) return finalOutput;
      return {
        objective: [{ text: "Objective evidence", pages: [1] }],
        methodology: prompt.includes("MIDDLE-MARKER") ? [{ text: "Surveyed 420 participants", pages: [4, 5] }] : [],
        findings: prompt.includes("LATE-RESULT-MARKER") ? [{ text: "Accuracy was 91 percent", pages: [8, 9] }] : [],
        conclusions: prompt.includes("FINAL-MARKER") ? [{ text: "Detection improved", pages: [12] }] : [],
        limitations: [],
        significance: [],
        keywords: ["detection"],
      };
    });
    const engine = createSummaryEngine({ generate, batchCharacterBudget: 6000 });
    const result = await engine.summarize(publication, chunks, "STANDARD");
    const batchPrompts = prompts.filter((prompt) => prompt.startsWith("EVIDENCE_BATCH"));
    expect(batchPrompts.length).toBeGreaterThan(1);
    expect(batchPrompts.join(" ")).toContain("FIRST-MARKER");
    expect(batchPrompts.join(" ")).toContain("MIDDLE-MARKER");
    expect(batchPrompts.join(" ")).toContain("LATE-RESULT-MARKER");
    expect(batchPrompts.join(" ")).toContain("FINAL-MARKER");
    const finalPrompt = prompts.find((prompt) => prompt.startsWith("FINAL_SYNTHESIS"))!;
    expect(finalPrompt).toContain("Surveyed 420 participants");
    expect(finalPrompt).toContain("Accuracy was 91 percent");
    expect(result).toMatchObject({
      methodology: { pages: [4, 5] },
      keyFindings: { pages: [8, 9] },
      limitations: { text: "Not stated in the document" },
    });
    expect(result.sourcePages).toEqual([1, 4, 5, 8, 9, 12]);
  });

  it("returns only overview/findings for SHORT and full sections for STANDARD/DETAILED", async () => {
    const generate = vi.fn(async (prompt: string) => prompt.startsWith("FINAL_SYNTHESIS") ? finalOutput : {
      objective: [], methodology: [], findings: [], conclusions: [], limitations: [], significance: [], keywords: [],
    });
    const engine = createSummaryEngine({ generate, batchCharacterBudget: 20_000 });
    const short = await engine.summarize(publication, chunks, "SHORT");
    expect(Object.keys(short).sort()).toEqual(["detailLevel", "inShort", "keyFindings", "keywords", "sourcePages"].sort());
    const standard = await engine.summarize(publication, chunks, "STANDARD");
    const detailed = await engine.summarize(publication, chunks, "DETAILED");
    expect(standard).toHaveProperty("methodology");
    expect(detailed).toHaveProperty("limitations");
  });

  it("builds an explicit page-cited fallback without claiming generated synthesis", () => {
    const fallback = buildSummaryFallback(publication, chunks);
    expect(fallback.notice).toMatch(/local.*unavailable/i);
    expect(fallback.metadata.abstract).toBe(publication.abstract);
    expect(fallback.evidence.map((item) => item.section)).toEqual(["Methods", "Results", "Conclusion"]);
    expect(fallback.evidence.flatMap((item) => item.pages)).toEqual(expect.arrayContaining([4, 8, 12]));
  });
});

describe("summary jobs and per-level caches", () => {
  function jobHarness() {
    const records = new Map<string, any>();
    const repository = {
      queue: vi.fn(async (documentId: string, detailLevel: string) => {
        const key = `${documentId}:${detailLevel}`;
        const existing = records.get(key);
        if (existing?.status === "READY" || existing?.status === "PENDING" || existing?.status === "PROCESSING") return existing;
        const record = { id: `summary-${detailLevel}`, documentId, detailLevel, status: "PENDING", mode: null, model: null, content: null, failureCode: null, failureMessage: null, updatedAt: new Date("2026-10-01T12:00:00Z") };
        records.set(key, record);
        return record;
      }),
      claim: vi.fn(async (id: string) => {
        const record = [...records.values()].find((item) => item.id === id);
        if (!record || record.status !== "PENDING") return null;
        record.status = "PROCESSING";
        return { ...record, publication, chunks };
      }),
      ready: vi.fn(async (id: string, content: unknown, mode: string, model: string | null) => {
        const record = [...records.values()].find((item) => item.id === id);
        Object.assign(record, { status: "READY", content, mode, model });
      }),
      failed: vi.fn(async (id: string, code: string, message: string) => {
        const record = [...records.values()].find((item) => item.id === id);
        Object.assign(record, { status: "FAILED", failureCode: code, failureMessage: message });
      }),
    };
    return { records, repository };
  }

  it("keeps independent SHORT/STANDARD/DETAILED cache records and preserves ready hits", async () => {
    const state = jobHarness();
    const service = createSummaryJobService({ repository: state.repository, summarize: vi.fn() });
    await service.queueSummary("doc-1", "SHORT");
    await service.queueSummary("doc-1", "STANDARD");
    await service.queueSummary("doc-1", "DETAILED");
    expect(state.records.size).toBe(3);
    state.records.get("doc-1:SHORT").status = "READY";
    const cached = await service.queueSummary("doc-1", "SHORT");
    expect(cached.status).toBe("READY");
  });

  it("moves a pending summary through PROCESSING to an Ollama READY result", async () => {
    const state = jobHarness();
    const generated = { ...finalOutput, detailLevel: "STANDARD" as const, sourcePages: [1, 4, 5, 8, 9, 12] };
    const service = createSummaryJobService({ repository: state.repository, summarize: vi.fn(async () => generated) });
    const queued = await service.queueSummary("doc-1", "STANDARD");
    await service.processSummary(queued.id);
    expect(state.repository.ready).toHaveBeenCalledWith(queued.id, generated, "OLLAMA", expect.any(String));
    expect(state.records.get("doc-1:STANDARD").status).toBe("READY");
  });

  it("stores deterministic fallback when Ollama is offline and FAILED for internal errors", async () => {
    const offline = jobHarness();
    const fallbackService = createSummaryJobService({
      repository: offline.repository,
      summarize: vi.fn(async () => { throw new LocalGenerationError("OLLAMA_UNAVAILABLE", "offline"); }),
    });
    const queued = await fallbackService.queueSummary("doc-1", "DETAILED");
    await fallbackService.processSummary(queued.id);
    expect(offline.records.get("doc-1:DETAILED")).toMatchObject({ status: "READY", mode: "FALLBACK" });

    const broken = jobHarness();
    const brokenService = createSummaryJobService({ repository: broken.repository, summarize: vi.fn(async () => { throw new Error("unexpected"); }) });
    const brokenJob = await brokenService.queueSummary("doc-1", "STANDARD");
    await brokenService.processSummary(brokenJob.id);
    expect(broken.records.get("doc-1:STANDARD")).toMatchObject({ status: "FAILED", failureCode: "SUMMARY_FAILED" });
  });
});
