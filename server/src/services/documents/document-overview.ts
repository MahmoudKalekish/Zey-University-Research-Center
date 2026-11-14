import type { SummaryChunk, SummaryDetail } from "./summary-engine.js";

const headings = [
  [
    "Experience",
    /^(?:(?:professional|work|relevant)\s+)?(?:experience|employment history|work history)\b/i,
  ],
  ["Education", /^(?:education|academic background)\b/i],
  [
    "Skills",
    /^(?:(?:technical|core|professional)\s+)?(?:skills|competencies)\b/i,
  ],
  ["Projects", /^(?:(?:selected|personal|academic)\s+)?projects\b/i],
  ["Certifications", /^(?:certifications?|credentials)\b/i],
  ["Profile", /^(?:professional summary|profile|about me)\b/i],
] as const;

function sectionHeading(line: string) {
  return headings.find(([, pattern]) => {
    const match = line.match(pattern);
    return match && /^[\s:]*$/.test(line.slice(match[0].length));
  })?.[0];
}

export function isResume(chunks: SummaryChunk[]) {
  const found = new Set<string>();
  for (const chunk of chunks) {
    for (const line of chunk.content.split("\n")) {
      const value = line.trim().split(":")[0]!;
      const heading = sectionHeading(value);
      if (heading) found.add(heading);
    }
  }
  return (
    found.size >= 2 &&
    (found.has("Experience") || found.has("Education") || found.has("Skills"))
  );
}

// A resume is presented using exact document lines, not claims inferred by AI.
export function buildResumeOverview(
  chunks: SummaryChunk[],
  detailLevel: SummaryDetail,
) {
  const sections = new Map<
    string,
    { section: string; items: string[]; pages: number[] }
  >();
  for (const chunk of chunks) {
    let section: string | undefined;
    for (const raw of chunk.content.split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      const colon = line.indexOf(":");
      const heading = sectionHeading(
        colon < 0 ? line : line.slice(0, colon).trim(),
      );
      if (heading) section = heading;
      else if (
        /^(?:hobbies|interests|languages|references|contact|awards|publications)\s*:?$/i.test(
          line,
        )
      )
        section = undefined;
      const item = (heading ? (colon < 0 ? "" : line.slice(colon + 1)) : line)
        .trim()
        .replace(/^[-•*]\s+/, "");
      if (
        !section ||
        item.length < 3 ||
        item.length > 350 ||
        /@|https?:\/\//i.test(item)
      )
        continue;
      const entry = sections.get(section) ?? { section, items: [], pages: [] };
      if (entry.items.length >= 4 || entry.items.includes(item)) continue;
      entry.items.push(item);
      for (let page = chunk.pageStart; page <= chunk.pageEnd; page++)
        entry.pages.push(page);
      sections.set(section, entry);
    }
  }
  const evidence = [...sections.values()].map(({ section, items, pages }) => ({
    section,
    text: items.map((item) => `- ${item}`).join("\n"),
    pages: [...new Set(pages)].sort((a, b) => a - b),
  }));
  return {
    detailLevel,
    kind: "RESUME" as const,
    evidence,
    sourcePages: [
      ...new Set(evidence.flatMap((section) => section.pages)),
    ].sort((a, b) => a - b),
  };
}
