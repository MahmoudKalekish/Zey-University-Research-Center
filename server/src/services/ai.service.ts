import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { globalSearch } from "./search.service.js";
const stop = new Set([
  "find",
  "show",
  "about",
  "which",
  "what",
  "who",
  "work",
  "works",
  "working",
  "are",
  "the",
  "and",
  "for",
  "with",
  "dans",
  "les",
  "des",
  "une",
  "sur",
  "qui",
  "quel",
  "quels",
  "research",
  "publications",
  "search",
  "find",
]);
function queryTerms(q: string) {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\W+/)
    .filter((x) => x.length > 2 && !stop.has(x))
    .slice(0, 5);
}
export async function askResearchAssistant(
  question: string,
  sessionId: string,
  userId?: string,
) {
  const isGreeting =
    /^(hello|hi|hey|good (morning|afternoon|evening))[!.\s]*$/i.test(
      question.trim(),
    );
  if (isGreeting) {
    const answer =
      "Hello! I can help you find publications, researchers, projects, and research areas in the Zey University Research Center database. Try asking: “Who works on cybersecurity?” or “Show me active research projects.”";
    const conversation = await prisma.aiConversation.upsert({
      where: { id: sessionId },
      create: { id: sessionId, sessionId, userId },
      update: { userId: userId ?? undefined },
    });
    await prisma.aiMessage.createMany({
      data: [
        { conversationId: conversation.id, role: "USER", content: question },
        {
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: answer,
          sources: [],
        },
      ],
    });
    return { answer, sources: [], mode: "fallback" };
  }
  const terms = queryTerms(question);
  const q = terms.join(" ") || question;
  let results = await globalSearch(q, 5);
  if (!Object.values(results).some((x: any) => x.length)) {
    for (const term of terms) {
      results = await globalSearch(term, 5);
      if (Object.values(results).some((x: any) => x.length)) break;
    }
  }
  const sources = [
    ...results.publications.map((x) => ({
      type: "publication",
      id: x.id,
      title: x.title,
      slug: x.slug,
    })),
    ...results.researchers.map((x) => ({
      type: "researcher",
      id: x.id,
      title: x.name,
      slug: x.slug,
    })),
    ...results.projects.map((x) => ({
      type: "project",
      id: x.id,
      title: x.title,
      slug: x.slug,
    })),
    ...results.areas.map((x) => ({
      type: "area",
      id: x.id,
      title: x.name,
      slug: x.slug,
    })),
  ].slice(0, 8);
  let answer = sources.length
    ? `I found ${sources.length} relevant result${sources.length > 1 ? "s" : ""} in the center's database: ${sources.map((s) => s.title).join("; ")}.`
    : `I could not find information matching this request in the research center's database.`;
  let mode = "fallback";
  if (sources.length) {
    try {
      const context = JSON.stringify({
        publications: results.publications.map((p) => ({
          title: p.title,
          abstract: p.abstract,
          authors: p.authors.map((a) => a.researcher.name),
          date: p.publicationDate,
        })),
        researchers: results.researchers.map((r) => ({
          name: r.name,
          position: r.position,
          interests: r.interests,
        })),
        projects: results.projects.map((p) => ({
          title: p.title,
          status: p.status,
          abstract: p.abstract,
        })),
        areas: results.areas,
      });
      const response = await fetch(`${env.OLLAMA_URL}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: env.OLLAMA_MODEL,
          stream: false,
          prompt: `You are a university research center assistant. Answer in English using only the supplied CONTEXT. Never invent information. Cite the relevant record titles.\nQUESTION: ${question}\nCONTEXT: ${context}`,
        }),
        signal: AbortSignal.timeout(6000),
      });
      if (response.ok) {
        const json = (await response.json()) as any;
        if (json.response) {
          answer = json.response;
          mode = "ollama";
        }
      }
    } catch {
      /* deterministic fallback */
    }
  }
  const conversation = await prisma.aiConversation.upsert({
    where: { id: sessionId },
    create: { id: sessionId, sessionId, userId },
    update: { userId: userId ?? undefined },
  });
  await prisma.aiMessage.createMany({
    data: [
      { conversationId: conversation.id, role: "USER", content: question },
      {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: answer,
        sources,
      },
    ],
  });
  return { answer, sources, mode };
}
