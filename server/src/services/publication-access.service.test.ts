import { describe, expect, it } from "vitest";
import { createPublicationAccessService } from "./publication-access.service.js";

const publications = {
  draft: {
    id: "draft",
    workflowStatus: "DRAFT" as const,
    authorResearcherIds: ["researcher-1"],
  },
  published: {
    id: "published",
    workflowStatus: "PUBLISHED" as const,
    authorResearcherIds: ["researcher-1"],
  },
};

function service(
  user: {
    id: string;
    role: "VISITOR" | "RESEARCHER" | "ADMIN";
    active: boolean;
    researcherId: string | null;
  } = {
    id: "user-1",
    role: "RESEARCHER",
    active: true,
    researcherId: "researcher-1",
  },
) {
  return createPublicationAccessService({
    findUser: async () => user,
    findPublication: async (id) =>
      publications[id as keyof typeof publications] ?? null,
  });
}

describe("publication access policy", () => {
  it("allows active administrators to manage any publication", async () => {
    const access = service({
      id: "admin",
      role: "ADMIN",
      active: true,
      researcherId: null,
    });
    await expect(
      access.requirePublicationManager("draft", "admin"),
    ).resolves.toMatchObject({ id: "draft" });
  });

  it("allows an active author but rejects a non-author for edit, upload, replace, and submit policy", async () => {
    await expect(
      service().requirePublicationAuthor("draft", "user-1"),
    ).resolves.toMatchObject({ id: "draft" });
    const outsider = service({
      id: "user-2",
      role: "RESEARCHER",
      active: true,
      researcherId: "researcher-2",
    });
    for (const operation of ["edit", "upload", "replace", "submit"]) {
      await expect(
        outsider.requirePublicationManager("draft", "user-2"),
      ).rejects.toMatchObject({ status: 403 });
      expect(operation).toBeTruthy();
    }
  });

  it("rejects inactive accounts even when the researcher is an author", async () => {
    const inactive = service({
      id: "user-1",
      role: "RESEARCHER",
      active: false,
      researcherId: "researcher-1",
    });
    await expect(
      inactive.requirePublicationAuthor("draft", "user-1"),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("hides drafts publicly but permits their author or an administrator", async () => {
    await expect(
      service().requirePublicOrManagerAccess("draft"),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      service().requirePublicOrManagerAccess("published"),
    ).resolves.toMatchObject({ id: "published" });
    await expect(
      service().requirePublicOrManagerAccess("draft", "user-1"),
    ).resolves.toMatchObject({ id: "draft" });
  });
});
