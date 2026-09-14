import { ProjectStatus } from "@prisma/client";
import { prisma } from "../config/db.js";

const searchStopWords = new Set([
  "a", "active", "all", "an", "and", "are", "about", "author", "authors",
  "can", "completed", "current", "do", "field", "fields", "find", "finished",
  "for", "from", "future", "give", "have", "how", "in", "is", "list", "many",
  "me", "of", "on", "ongoing", "paper", "papers", "past", "paused", "people",
  "planned", "please", "professor", "professors", "program", "programs", "project",
  "projects", "publication", "publications", "research", "researcher", "researchers",
  "search", "show", "suspended", "team", "tell", "the", "theme", "themes", "to",
  "topic", "topics", "upcoming", "what", "which", "who", "with", "work", "working",
  "works",
]);

export function searchTerms(query: string) {
  const normalized = query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const terms = normalized
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 1 && !searchStopWords.has(term));
  if (/\bai\b/.test(normalized)) terms.push("artificial intelligence", "AI");
  if (/\bml\b/.test(normalized)) terms.push("machine learning");
  if (/\bnlp\b/.test(normalized)) terms.push("natural language", "NLP");
  if (/\biot\b/.test(normalized)) terms.push("internet of things", "IoT");
  return [...new Set(terms)].slice(0, 10);
}

export function projectStatusFromQuery(query: string) {
  const normalized = query.toLowerCase();
  if (/\b(active|ongoing|current)\b/.test(normalized)) return ProjectStatus.ACTIVE;
  if (/\b(planned|upcoming|future)\b/.test(normalized)) return ProjectStatus.PLANNED;
  if (/\b(completed|complete|finished|past)\b/.test(normalized)) return ProjectStatus.COMPLETED;
  if (/\b(suspended|paused|on hold)\b/.test(normalized)) return ProjectStatus.SUSPENDED;
  return undefined;
}

export async function globalSearch(q: string, limit = 6) {
  const phrase = q.trim();
  const terms = searchTerms(phrase);
  const searchable = [...new Set([phrase, ...terms])].filter(Boolean);
  if (!searchable.length)
    return { publications: [], researchers: [], projects: [], areas: [] };
  const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });
  const status = projectStatusFromQuery(phrase);
  const [publications, researchers, projects, areas] = await Promise.all([
    prisma.publication.findMany({
      where: {
        OR: searchable.flatMap((term) => [
          { title: contains(term) },
          { abstract: contains(term) },
          { venue: contains(term) },
          { authors: { some: { researcher: { name: contains(term) } } } },
          { areas: { some: { area: { name: contains(term) } } } },
          { project: { title: contains(term) } },
        ]),
      },
      include: {
        authors: { include: { researcher: true }, orderBy: { authorOrder: "asc" } },
        areas: { include: { area: true } },
        project: true,
      },
      take: limit,
      orderBy: { publicationDate: "desc" },
    }),
    prisma.researcher.findMany({
      where: {
        active: true,
        OR: searchable.flatMap((term) => [
          { name: contains(term) },
          { biography: contains(term) },
          { position: contains(term) },
          { affiliation: contains(term) },
          { areas: { some: { area: { name: contains(term) } } } },
        ]),
      },
      include: { areas: { include: { area: true } } },
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: status
        ? { status, ...(terms.length ? { OR: searchable.flatMap((term) => [
            { title: contains(term) },
            { description: contains(term) },
            { abstract: contains(term) },
            { funding: contains(term) },
            { areas: { some: { area: { name: contains(term) } } } },
            { researchers: { some: { researcher: { name: contains(term) } } } },
          ]) } : {}) }
        : {
            OR: searchable.flatMap((term) => [
              { title: contains(term) },
              { description: contains(term) },
              { abstract: contains(term) },
              { funding: contains(term) },
              { areas: { some: { area: { name: contains(term) } } } },
              { researchers: { some: { researcher: { name: contains(term) } } } },
            ]),
          },
      include: {
        areas: { include: { area: true } },
        researchers: { include: { researcher: true } },
      },
      take: limit,
      orderBy: { startDate: "desc" },
    }),
    prisma.researchArea.findMany({
      where: {
        OR: searchable.flatMap((term) => [
          { name: contains(term) },
          { description: contains(term) },
        ]),
      },
      take: limit,
      orderBy: { name: "asc" },
    }),
  ]);
  return { publications, researchers, projects, areas };
}
