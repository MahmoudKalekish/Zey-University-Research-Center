import type { PublicationWorkflowStatus, Role } from "@prisma/client";
import { prisma } from "../config/db.js";
import { HttpError } from "../utils/http.js";

interface AccessUser {
  id: string;
  role: Role;
  active: boolean;
  researcherId: string | null;
}

interface AccessPublication {
  id: string;
  workflowStatus: PublicationWorkflowStatus;
  authorResearcherIds: string[];
}

interface AccessRepository {
  findUser: (userId: string) => Promise<AccessUser | null>;
  findPublication: (publicationId: string) => Promise<AccessPublication | null>;
}

const repository: AccessRepository = {
  async findUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        active: true,
        researcher: { select: { id: true } },
      },
    });
    return user
      ? {
          id: user.id,
          role: user.role,
          active: user.active,
          researcherId: user.researcher?.id ?? null,
        }
      : null;
  },
  async findPublication(publicationId) {
    const publication = await prisma.publication.findUnique({
      where: { id: publicationId },
      select: {
        id: true,
        workflowStatus: true,
        authors: { select: { researcherId: true } },
      },
    });
    return publication
      ? {
          id: publication.id,
          workflowStatus: publication.workflowStatus,
          authorResearcherIds: publication.authors.map(
            (author) => author.researcherId,
          ),
        }
      : null;
  },
};

export function createPublicationAccessService(
  accessRepository: AccessRepository,
) {
  const load = async (publicationId: string) => {
    const publication = await accessRepository.findPublication(publicationId);
    if (!publication) throw new HttpError(404, "Publication not found");
    return publication;
  };
  const activeUser = async (userId: string) => {
    const user = await accessRepository.findUser(userId);
    if (!user?.active) throw new HttpError(403, "Active account required");
    return user;
  };
  return {
    async requirePublicationAuthor(publicationId: string, userId: string) {
      const [publication, user] = await Promise.all([
        load(publicationId),
        activeUser(userId),
      ]);
      if (
        !user.researcherId ||
        !publication.authorResearcherIds.includes(user.researcherId)
      ) {
        throw new HttpError(403, "You may only manage publications you author");
      }
      return publication;
    },
    async requirePublicationManager(publicationId: string, userId: string) {
      const [publication, user] = await Promise.all([
        load(publicationId),
        activeUser(userId),
      ]);
      if (user.role === "ADMIN") return publication;
      if (
        user.role !== "RESEARCHER" ||
        !user.researcherId ||
        !publication.authorResearcherIds.includes(user.researcherId)
      ) {
        throw new HttpError(403, "You may only manage publications you author");
      }
      return publication;
    },
    async requirePublicOrManagerAccess(publicationId: string, userId?: string) {
      const publication = await load(publicationId);
      if (publication.workflowStatus === "PUBLISHED") return publication;
      if (!userId) throw new HttpError(404, "Publication not found");
      const user = await activeUser(userId);
      const canManage =
        user.role === "ADMIN" ||
        (user.role === "RESEARCHER" &&
          Boolean(user.researcherId) &&
          publication.authorResearcherIds.includes(user.researcherId!));
      if (!canManage) throw new HttpError(404, "Publication not found");
      return publication;
    },
  };
}

const access = createPublicationAccessService(repository);
export const requirePublicationAuthor = access.requirePublicationAuthor;
export const requirePublicationManager = access.requirePublicationManager;
export const requirePublicOrManagerAccess = access.requirePublicOrManagerAccess;
