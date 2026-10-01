import type { ExtractedPage } from "./pdf.service.js";

export interface ChunkDraft {
  chunkIndex: number;
  pageStart: number;
  pageEnd: number;
  sectionTitle?: string;
  content: string;
  normalizedText: string;
  tokenEstimate: number;
}

export interface ChunkOptions {
  targetCharacters?: number;
  overlapCharacters?: number;
  maximumCharacters?: number;
}

const headingPattern = /^(abstract|introduction|background|related work|methods?|methodology|materials and methods|results?|discussion|conclusions?|limitations?|references)$/i;

export function normalizeDocumentText(text: string) {
  return text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

export function isTextUsable(pages: ExtractedPage[]) {
  const normalized = normalizeDocumentText(pages.map((page) => page.text).join(" "));
  const meaningful = normalized.replace(/[^\p{L}\p{N}]/gu, "");
  return meaningful.length >= 40;
}

interface Segment {
  pageNumber: number;
  text: string;
  heading?: string;
}

function pageSegments(page: ExtractedPage, maximumCharacters: number): Segment[] {
  const blocks = page.text
    .replace(/\r/g, "")
    .split(/\n{2,}|(?<=^[A-Za-z][A-Za-z ]{2,40})\n/gm)
    .map((part) => part.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
  const segments: Segment[] = [];
  let currentHeading: string | undefined;
  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines[0] && headingPattern.test(lines[0])) currentHeading = lines[0];
    for (let start = 0; start < block.length; start += maximumCharacters) {
      segments.push({
        pageNumber: page.pageNumber,
        text: block.slice(start, start + maximumCharacters),
        heading: currentHeading,
      });
    }
  }
  return segments;
}

export function chunkPages(pages: ExtractedPage[], options: ChunkOptions = {}): ChunkDraft[] {
  const target = Math.min(Math.max(options.targetCharacters ?? 3000, 500), 3500);
  const maximum = Math.min(Math.max(options.maximumCharacters ?? 3500, target), 3500);
  const overlap = Math.min(Math.max(options.overlapCharacters ?? 250, 0), 500);
  const segments = pages.flatMap((page) => pageSegments(page, maximum));
  const drafts: Array<{ segments: Segment[]; content: string }> = [];
  let selected: Segment[] = [];
  let length = 0;

  const flush = () => {
    if (!selected.length) return;
    drafts.push({ segments: selected, content: selected.map((segment) => segment.text).join("\n\n") });
    selected = [];
    length = 0;
  };

  for (const segment of segments) {
    const addition = segment.text.length + (selected.length ? 2 : 0);
    if (selected.length && length + addition > target) flush();
    selected.push(segment);
    length += segment.text.length + (selected.length > 1 ? 2 : 0);
  }
  flush();

  return drafts.map((draft, chunkIndex) => {
    let content = draft.content;
    if (chunkIndex > 0 && overlap > 0) {
      const prefix = drafts[chunkIndex - 1]!.content.slice(-overlap).trimStart();
      content = `${prefix}\n\n${content}`.slice(0, maximum);
    }
    const pageNumbers = draft.segments.map((segment) => segment.pageNumber);
    if (chunkIndex > 0 && overlap > 0) {
      pageNumbers.push(drafts[chunkIndex - 1]!.segments.at(-1)?.pageNumber ?? pageNumbers[0]!);
    }
    const normalizedText = normalizeDocumentText(content);
    return {
      chunkIndex,
      pageStart: Math.min(...pageNumbers),
      pageEnd: Math.max(...pageNumbers),
      sectionTitle: draft.segments.find((segment) => segment.heading)?.heading,
      content,
      normalizedText,
      tokenEstimate: Math.max(1, Math.ceil(normalizedText.length / 4)),
    };
  });
}
