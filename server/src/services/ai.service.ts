import { ensureLocalEndpoint } from "./documents/ollama.service.js";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { globalSearch, searchTerms } from "./search.service.js";

type AssistantSource = {
  type: string;
  id: string;
  title: string;
  slug: string;
};

async function saveExchange(
  sessionId: string,
  question: string,
  answer: string,
  sources: AssistantSource[],
  userId?: string,
) {
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
    await saveExchange(sessionId, question, answer, [], userId);
    return { answer, sources: [], mode: "fallback" };
  }

  if (/\b(how many|number of|statistics|stats)\b/i.test(question)) {
    const [researchers, projects, publications, areas] = await Promise.all([
      prisma.researcher.count({ where: { active: true } }),
      prisma.project.count(),
      prisma.publication.count({ where: { workflowStatus: "PUBLISHED" } }),
      prisma.researchArea.count(),
    ]);
    const answer = `The center database currently contains ${researchers} active researchers, ${projects} projects, ${publications} publications, and ${areas} research areas.`;
    await saveExchange(sessionId, question, answer, [], userId);
    return { answer, sources: [], mode: "database" };
  }

  const terms = searchTerms(question);
  let results = await globalSearch(question, 6);
  const hasResults = () =>
    Object.values(results).some((records) => records.length);

  if (!hasResults()) {
    for (const term of terms) {
      results = await globalSearch(term, 6);
      if (hasResults()) break;
    }
  }

  if (!hasResults()) {
    const asksPublications =
      /\b(papers?|publications?|articles?|thes(?:is|es)|datasets?)\b/i.test(
        question,
      );
    const asksResearchers =
      /\b(researchers?|authors?|professors?|people|experts?|team)\b/i.test(
        question,
      );
    const asksProjects =
      /\bprojects?|initiatives?|programmes?|programs?\b/i.test(question);
    const asksAreas = /\b(areas?|fields?|domains?|topics?|themes?)\b/i.test(
      question,
    );
    const include = {
      publications: asksPublications,
      researchers: asksResearchers,
      projects: asksProjects,
      areas: asksAreas,
    };
    if (Object.values(include).some(Boolean)) {
      const [publications, researchers, projects, areas] = await Promise.all([
        include.publications
          ? prisma.publication.findMany({
              where: { workflowStatus: "PUBLISHED" },
              take: 6,
              orderBy: { publicationDate: "desc" },
              include: {
                authors: {
                  include: { researcher: true },
                  orderBy: { authorOrder: "asc" },
                },
                areas: { include: { area: true } },
                project: true,
              },
            })
          : [],
        include.researchers
          ? prisma.researcher.findMany({
              take: 6,
              where: { active: true },
              orderBy: { name: "asc" },
              include: { areas: { include: { area: true } } },
            })
          : [],
        include.projects
          ? prisma.project.findMany({
              take: 6,
              orderBy: { startDate: "desc" },
              include: {
                areas: { include: { area: true } },
                researchers: { include: { researcher: true } },
              },
            })
          : [],
        include.areas
          ? prisma.researchArea.findMany({ take: 6, orderBy: { name: "asc" } })
          : [],
      ]);
      results = { publications, researchers, projects, areas };
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
  const fallbackParts = [
    results.researchers.length
      ? `Researchers: ${results.researchers.map((r) => `${r.name} (${r.position})`).join("; ")}.`
      : "",
    results.projects.length
      ? `Projects: ${results.projects.map((p) => `${p.title} (${p.status.toLowerCase()})`).join("; ")}.`
      : "",
    results.publications.length
      ? `Publications: ${results.publications.map((p) => `${p.title} — ${p.authors.map((a) => a.researcher.name).join(", ")}`).join("; ")}.`
      : "",
    results.areas.length
      ? `Research areas: ${results.areas.map((a) => a.name).join("; ")}.`
      : "",
  ].filter(Boolean);
  let answer = sources.length
    ? `I found the following information in the center database. ${fallbackParts.join(" ")}`
    : "I could not find information matching this request in the research center's database. Try using a topic, researcher name, publication title, project status, or research area that exists on the website.";
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
          researchers: p.researchers.map((r) => r.researcher.name),
          areas: p.areas.map((a) => a.area.name),
        })),
        areas: results.areas.map((a) => ({
          name: a.name,
          description: a.description,
          objectives: a.objectives,
        })),
      });
      const response = await fetch(
        `${ensureLocalEndpoint(env.OLLAMA_URL)}/api/generate`,
        {
          method: "POST",
          redirect: "error",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model: env.OLLAMA_MODEL,
            stream: false,
            options: {
              temperature: 0.2,
              num_ctx: 4096,
              num_predict: 350,
            },
            prompt: `You are a university research center assistant. Answer in English using only the supplied CONTEXT. Never invent information. Cite the relevant record titles.\nQUESTION: ${question}\nCONTEXT: ${context}`,
          }),
          signal: AbortSignal.timeout(env.OLLAMA_TIMEOUT_MS),
        },
      );
      if (response.ok) {
        const json = (await response.json()) as any;
        if (json.response) {
          answer = json.response;
          mode = "ollama";
        }
      } else if (env.NODE_ENV !== "test") {
        console.warn(
          `Ollama returned HTTP ${response.status}; using database fallback.`,
        );
      }
    } catch (error) {
      if (env.NODE_ENV !== "test")
        console.warn(
          `Ollama generation unavailable; using database fallback: ${error instanceof Error ? error.message : "unknown error"}`,
        );
    }
  }
  await saveExchange(sessionId, question, answer, sources, userId);
  return { answer, sources, mode };
}
