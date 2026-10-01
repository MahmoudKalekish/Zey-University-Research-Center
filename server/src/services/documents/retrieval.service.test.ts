import { describe, expect, it } from "vitest";
import { rankDocumentChunks } from "./retrieval.service.js";

const chunks = [
  { id: "c0", chunkIndex: 0, pageStart: 1, pageEnd: 1, sectionTitle: "Introduction", content: "Smart cities use connected systems.", normalizedText: "smart cities use connected systems" },
  { id: "c1", chunkIndex: 1, pageStart: 2, pageEnd: 2, sectionTitle: "Methods", content: "Machine learning model training used sensor records.", normalizedText: "machine learning model training used sensor records" },
  { id: "c2", chunkIndex: 2, pageStart: 3, pageEnd: 3, sectionTitle: "Results", content: "The machine learning model achieved improved accuracy.", normalizedText: "the machine learning model achieved improved accuracy" },
  { id: "c3", chunkIndex: 3, pageStart: 4, pageEnd: 4, sectionTitle: "Discussion", content: "Accuracy varied across districts.", normalizedText: "accuracy varied across districts" },
  { id: "c4", chunkIndex: 4, pageStart: 9, pageEnd: 9, sectionTitle: "Limitations", content: "The sample excludes rural districts.", normalizedText: "the sample excludes rural districts" },
];

describe("page-aware lexical retrieval", () => {
  it("weights exact phrases, term frequency, and matching section headings", () => {
    const ranked = rankDocumentChunks("machine learning results", chunks, 3);
    expect(ranked[0]?.chunk.id).toBe("c2");
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
  });

  it("adds adjacent context while retaining page diversity and deterministic ties", () => {
    const ranked = rankDocumentChunks("accuracy limitations", chunks, 4);
    expect(ranked.map((item) => item.chunk.id)).toEqual(expect.arrayContaining(["c2", "c3", "c4"]));
    expect(new Set(ranked.map((item) => item.chunk.pageStart)).size).toBeGreaterThan(1);
    expect(rankDocumentChunks("districts", chunks, 2).map((item) => item.chunk.id)).toEqual(
      rankDocumentChunks("districts", chunks, 2).map((item) => item.chunk.id),
    );
  });

  it("ignores stop-word-only and empty questions", () => {
    expect(rankDocumentChunks("the and of", chunks, 3)).toEqual([]);
    expect(rankDocumentChunks("   ", chunks, 3)).toEqual([]);
  });
});
