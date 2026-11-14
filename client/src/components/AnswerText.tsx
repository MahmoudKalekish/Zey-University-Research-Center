// A small, text-only formatting subset. Model output never becomes HTML or URLs.
function inline(text: string) {
  return text
    .split(/(\*\*[^*\n]+\*\*|\`[^\`\n]+\`)/g)
    .map((part, i) =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : part.startsWith("\`") && part.endsWith("\`") && part.length > 2 ? (
        <code key={i}>{part.slice(1, -1)}</code>
      ) : (
        part
      ),
    );
}

type Block =
  | { kind: "paragraph" | "heading"; text: string }
  | { kind: "bullets" | "numbered"; items: string[]; start?: number };

function format(text: string) {
  const blocks: Block[] = [];
  for (const raw of text
    .replace(/\r\n?/g, "\n")
    // Some models put an entire list on one line. Require a clear boundary
    // so a date or a phrase such as “2026 - 2027” is left intact.
    .replace(/([:;.!?])[ \t]+(?=(?:\d{1,2}[.)]|[-*•])[ \t]+\S)/g, "$1\n")
    .split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const heading =
      line.match(/^#{1,6}\s+(.+)$/) ?? line.match(/^\*\*([^*]+)\*\*:?$/);
    const bullet = line.match(/^[-*•]\s+(.+)$/);
    const numbered = line.match(/^(\d{1,3})[.)]\s+(.+)$/);
    if (heading) blocks.push({ kind: "heading", text: heading[1]! });
    else if (bullet || numbered) {
      const kind = bullet ? "bullets" : "numbered";
      const value = bullet?.[1] ?? numbered![2]!;
      const last = blocks.at(-1);
      if (last?.kind === kind) last.items.push(value);
      else
        blocks.push({
          kind,
          items: [value],
          start: numbered ? Number(numbered[1]) : undefined,
        });
    } else blocks.push({ kind: "paragraph", text: line });
  }
  return blocks;
}

export function AnswerText({ text }: { text: string }) {
  return (
    <div className="answer-text">
      {format(text).map((block, index) => {
        switch (block.kind) {
          case "heading":
            return <h4 key={index}>{inline(block.text)}</h4>;
          case "paragraph":
            return <p key={index}>{inline(block.text)}</p>;
          case "bullets":
          case "numbered": {
            const List = block.kind === "bullets" ? "ul" : "ol";
            return (
              <List key={index} start={block.start}>
                {block.items.map((item, i) => (
                  <li key={i}>{inline(item)}</li>
                ))}
              </List>
            );
          }
        }
      })}
    </div>
  );
}
