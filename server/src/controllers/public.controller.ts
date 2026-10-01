import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { pageMeta } from "../utils/http.js";
const paging = (req: Request) => {
  const page = Math.max(1, Number(req.query.page) || 1),
    limit = Math.min(24, Math.max(1, Number(req.query.limit) || 9));
  return { page, limit, skip: (page - 1) * limit };
};
export async function home(_req: Request, res: Response) {
  const now = new Date();
  const [
    researchers,
    publications,
    projects,
    areas,
    events,
    news,
    featuredProjects,
    recentPublications,
    people,
  ] = await Promise.all([
    prisma.researcher.count({ where: { active: true } }),
    prisma.publication.count({ where: { workflowStatus: "PUBLISHED" } }),
    prisma.project.count(),
    prisma.researchArea.count(),
    prisma.event.findMany({
      where: { published: true, startDate: { gte: now } },
      orderBy: { startDate: "asc" },
      take: 3,
    }),
    prisma.news.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
    prisma.project.findMany({
      where: { featured: true },
      include: { areas: { include: { area: true } } },
      take: 3,
    }),
    prisma.publication.findMany({
      where: { workflowStatus: "PUBLISHED" },
      include: {
        authors: { include: { researcher: true } },
        areas: { include: { area: true } },
      },
      orderBy: { publicationDate: "desc" },
      take: 4,
    }),
    prisma.researcher.findMany({
      where: { active: true },
      include: { areas: { include: { area: true } } },
      take: 4,
    }),
  ]);
  res.json({
    stats: { researchers, publications, projects, areas },
    events,
    news,
    featuredProjects,
    recentPublications,
    researchers: people,
  });
}
export async function areas(_req: Request, res: Response) {
  res.json(
    await prisma.researchArea.findMany({
      include: {
        _count: {
          select: {
            researchers: true,
            projects: true,
            publications: {
              where: { publication: { workflowStatus: "PUBLISHED" } },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  );
}
export async function researchers(req: Request, res: Response) {
  const { page, limit, skip } = paging(req),
    q = String(req.query.q || ""),
    area = String(req.query.area || "");
  const where: any = {
    active: true,
    AND: [
      q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { position: { contains: q, mode: "insensitive" } },
              { biography: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      area ? { areas: { some: { area: { slug: area } } } } : {},
    ],
  };
  const [items, total] = await Promise.all([
    prisma.researcher.findMany({
      where,
      include: {
        areas: { include: { area: true } },
        _count: {
          select: {
            publications: {
              where: { publication: { workflowStatus: "PUBLISHED" } },
            },
            projects: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.researcher.count({ where }),
  ]);
  res.json({ items, meta: pageMeta(page, limit, total) });
}
export async function researcher(req: Request, res: Response) {
  res.json(
    await prisma.researcher.findUniqueOrThrow({
      where: { slug: String(req.params.slug) },
      include: {
        areas: { include: { area: true } },
        publications: {
          where: { publication: { workflowStatus: "PUBLISHED" } },
          include: { publication: true },
          orderBy: { authorOrder: "asc" },
        },
        projects: { include: { project: true } },
      },
    }),
  );
}
export async function projects(req: Request, res: Response) {
  const { page, limit, skip } = paging(req),
    q = String(req.query.q || ""),
    status = String(req.query.status || "");
  const where: any = {
    AND: [
      q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { abstract: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      status ? { status } : {},
    ],
  };
  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        areas: { include: { area: true } },
        researchers: { include: { researcher: true } },
        _count: {
          select: { publications: { where: { workflowStatus: "PUBLISHED" } } },
        },
      },
      skip,
      take: limit,
      orderBy: { startDate: "desc" },
    }),
    prisma.project.count({ where }),
  ]);
  res.json({ items, meta: pageMeta(page, limit, total) });
}
export async function project(req: Request, res: Response) {
  res.json(
    await prisma.project.findUniqueOrThrow({
      where: { slug: String(req.params.slug) },
      include: {
        areas: { include: { area: true } },
        researchers: { include: { researcher: true } },
        publications: {
          where: { workflowStatus: "PUBLISHED" },
          include: { authors: { include: { researcher: true } } },
        },
      },
    }),
  );
}
export async function publications(req: Request, res: Response) {
  const { page, limit, skip } = paging(req),
    q = String(req.query.q || ""),
    author = String(req.query.author || ""),
    area = String(req.query.area || ""),
    type = String(req.query.type || ""),
    year = Number(req.query.year) || 0,
    sort = req.query.sort === "oldest" ? "asc" : "desc";
  const where: any = {
    workflowStatus: "PUBLISHED",
    AND: [
      q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { abstract: { contains: q, mode: "insensitive" } },
              { keywords: { has: q.toLowerCase() } },
            ],
          }
        : {},
      author ? { authors: { some: { researcher: { slug: author } } } } : {},
      area ? { areas: { some: { area: { slug: area } } } } : {},
      type ? { type } : {},
      year
        ? {
            publicationDate: {
              gte: new Date(`${year}-01-01`),
              lt: new Date(`${year + 1}-01-01`),
            },
          }
        : {},
    ],
  };
  const [items, total] = await Promise.all([
    prisma.publication.findMany({
      where,
      include: {
        authors: {
          include: { researcher: true },
          orderBy: { authorOrder: "asc" },
        },
        areas: { include: { area: true } },
        project: true,
      },
      skip,
      take: limit,
      orderBy: { publicationDate: sort },
    }),
    prisma.publication.count({ where }),
  ]);
  res.json({ items, meta: pageMeta(page, limit, total) });
}
export async function publication(req: Request, res: Response) {
  const record = await prisma.publication.findUniqueOrThrow({
    where: { slug: String(req.params.slug), workflowStatus: "PUBLISHED" },
    include: {
      authors: {
        include: { researcher: true },
        orderBy: { authorOrder: "asc" },
      },
      areas: { include: { area: true } },
      project: true,
      document: {
        select: {
          id: true,
          status: true,
          pageCount: true,
          originalName: true,
          sizeBytes: true,
        },
      },
    },
  });
  const ready = record.document?.status === "READY";
  res.json({
    ...record,
    documentCapabilities: {
      canRead: ready,
      canSummarize: ready,
      canAsk: ready,
    },
  });
}
export async function content(req: Request, res: Response) {
  const kind = req.params.kind;
  if (kind === "events")
    return res.json(
      await prisma.event.findMany({
        where: { published: true },
        orderBy: { startDate: "desc" },
      }),
    );
  if (kind === "news")
    return res.json(
      await prisma.news.findMany({
        where: { published: true },
        orderBy: { publishedAt: "desc" },
      }),
    );
  if (kind === "resources")
    return res.json(
      await prisma.resource.findMany({
        where: { published: true },
        orderBy: { createdAt: "desc" },
      }),
    );
  res.status(404).json({ message: "Unknown content type" });
}
