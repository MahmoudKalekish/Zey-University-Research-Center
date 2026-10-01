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

const headingPattern =
  /^(abstract|objective|introduction|background|related work|methods?|methodology|materials and methods|results?|discussion|conclusions?|limitations?|references)$/i;

export function normalizeDocumentText(text: string) {
  return text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

export function isTextUsable(pages: ExtractedPage[]) {
  const normalized = normalizeDocumentText(
    pages.map((page) => page.text).join(" "),
  );
  const meaningful = normalized.replace(/[^\p{L}\p{N}]/gu, "");
  return meaningful.length >= 40;
}

interface Segment {
  pageNumber: number;
  text: string;
  heading?: string;
}

function pageSegments(
  page: ExtractedPage,
  maximumCharacters: number,
): Segment[] {
  const segments: Segment[] = [];
  let heading: string | undefined;
  let lines: string[] = [];
  const flush = () => {
    const text = lines.join("\n").trim();
    for (let start = 0; start < text.length; start += maximumCharacters) {
      segments.push({
        pageNumber: page.pageNumber,
        text: text.slice(start, start + maximumCharacters),
        heading,
      });
    }
    lines = [];
  };
  for (const rawLine of page.text.replace(/\r/g, "").split("\n")) {
    const line = rawLine.replace(/[ \t]+/g, " ").trim();
    if (!line) {
      flush();
      continue;
    }
    if (headingPattern.test(line)) {
      flush();
      heading = line;
    }
    lines.push(line);
  }
  flush();
  return segments;
}

export function chunkPages(
  pages: ExtractedPage[],
  options: ChunkOptions = {},
): ChunkDraft[] {
  const target = Math.min(
    Math.max(options.targetCharacters ?? 3000, 500),
    3500,
  );
  const maximum = Math.min(
    Math.max(options.maximumCharacters ?? 3500, target),
    3500,
  );
  const overlap = Math.min(Math.max(options.overlapCharacters ?? 250, 0), 500);
  const payloadMaximum = maximum - overlap - 2;
  const segments = pages.flatMap((page) => pageSegments(page, payloadMaximum));
  const drafts: Array<{ segments: Segment[]; content: string }> = [];
  let selected: Segment[] = [];
  let length = 0;

  const flush = () => {
    if (!selected.length) return;
    drafts.push({
      segments: selected,
      content: selected.map((segment) => segment.text).join("\n\n"),
    });
    selected = [];
    length = 0;
  };

  for (const segment of segments) {
    const addition = segment.text.length + (selected.length ? 2 : 0);
    if (
      selected.length &&
      (length + addition > Math.min(target, payloadMaximum) ||
        selected[0]!.pageNumber !== segment.pageNumber ||
        selected[0]!.heading !== segment.heading)
    )
      flush();
    selected.push(segment);
    length += segment.text.length + (selected.length > 1 ? 2 : 0);
  }
  flush();

  return drafts.map((draft, chunkIndex) => {
    let content = draft.content;
    const previous = drafts[chunkIndex - 1];
    const canOverlap =
      previous &&
      overlap > 0 &&
      previous.segments.at(-1)!.pageNumber === draft.segments[0]!.pageNumber &&
      previous.segments.at(-1)!.heading === draft.segments[0]!.heading;
    if (canOverlap) {
      const prefix =
        drafts[chunkIndex - 1]!.content.slice(-overlap).trimStart();
      content = `${prefix}\n\n${content}`;
    }
    const pageNumbers = draft.segments.map((segment) => segment.pageNumber);
    if (canOverlap) {
      pageNumbers.push(
        drafts[chunkIndex - 1]!.segments.at(-1)?.pageNumber ?? pageNumbers[0]!,
      );
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
