import { prisma } from "../config/db.js";
export async function globalSearch(q: string, limit = 6) {
  const contains = { contains: q, mode: "insensitive" as const };
  const [publications, researchers, projects, areas] = await Promise.all([
    prisma.publication.findMany({
      where: {
        OR: [
          { title: contains },
          { abstract: contains },
          { venue: contains },
          { keywords: { has: q.toLowerCase() } },
        ],
      },
      include: {
        authors: { include: { researcher: true } },
        areas: { include: { area: true } },
      },
      take: limit,
      orderBy: { publicationDate: "desc" },
    }),
    prisma.researcher.findMany({
      where: {
        active: true,
        OR: [
          { name: contains },
          { biography: contains },
          { position: contains },
          { interests: { has: q.toLowerCase() } },
        ],
      },
      include: { areas: { include: { area: true } } },
      take: limit,
    }),
    prisma.project.findMany({
      where: {
        OR: [
          { title: contains },
          { description: contains },
          { abstract: contains },
        ],
      },
      include: {
        areas: { include: { area: true } },
        researchers: { include: { researcher: true } },
      },
      take: limit,
    }),
    prisma.researchArea.findMany({
      where: { OR: [{ name: contains }, { description: contains }] },
      take: limit,
    }),
  ]);
  return { publications, researchers, projects, areas };
}
