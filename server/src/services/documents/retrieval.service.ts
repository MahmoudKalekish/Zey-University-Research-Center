export interface RetrievableChunk {
  id: string;
  chunkIndex: number;
  pageStart: number;
  pageEnd: number;
  sectionTitle: string | null | undefined;
  content: string;
  normalizedText: string;
}

export interface RankedChunk {
  chunk: RetrievableChunk;
  score: number;
  adjacent: boolean;
}

const stopWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "did", "do", "does", "for", "from",
  "how", "in", "is", "it", "of", "on", "or", "that", "the", "this", "to", "was", "were",
  "what", "when", "where", "which", "who", "why", "with",
]);

function queryTerms(question: string) {
  return [...new Set(question
    .normalize("NFKC")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length > 1 && !stopWords.has(term)))];
}

export function rankDocumentChunks(
  question: string,
  chunks: RetrievableChunk[],
  limit = 6,
): RankedChunk[] {
  const terms = queryTerms(question);
  if (!terms.length || limit <= 0) return [];
  const phrase = terms.join(" ");
  const scored = chunks
    .map((chunk) => {
      const text = chunk.normalizedText.toLowerCase();
      const heading = (chunk.sectionTitle ?? "").toLowerCase();
      let score = phrase.length > 3 && text.includes(phrase) ? 12 : 0;
      for (const term of terms) {
        const matches = text.match(new RegExp(`(^|[^\\p{L}\\p{N}])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}\\p{N}]|$)`, "gu"));
        score += Math.min(matches?.length ?? 0, 5) * 2;
        if (heading.includes(term)) score += 5;
      }
      return { chunk, score, adjacent: false };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.chunk.chunkIndex - right.chunk.chunkIndex);
  if (!scored.length) return [];

  const selected = new Map<string, RankedChunk>();
  const byIndex = new Map(chunks.map((chunk) => [chunk.chunkIndex, chunk]));
  for (const ranked of scored) {
    if (selected.size >= limit) break;
    selected.set(ranked.chunk.id, ranked);
    for (const index of [ranked.chunk.chunkIndex - 1, ranked.chunk.chunkIndex + 1]) {
      if (selected.size >= limit) break;
      const neighbor = byIndex.get(index);
      if (neighbor && !selected.has(neighbor.id)) {
        selected.set(neighbor.id, { chunk: neighbor, score: ranked.score * 0.25, adjacent: true });
      }
    }
  }
  return [...selected.values()]
    .sort((left, right) => right.score - left.score || left.chunk.chunkIndex - right.chunk.chunkIndex)
    .slice(0, limit);
}
