import { describe, expect, it, vi } from "vitest";
import { createPublicationLifecycleService } from "./publication-lifecycle.service.js";

function setup(status = "DRAFT", documentStatus: string | null = "READY") {
  const repository = {
    find: vi.fn(async () => ({
      id: "paper",
      workflowStatus: status,
      document: documentStatus ? { status: documentStatus } : null,
    })),
    transition: vi.fn(
      async (_id: string, _from: string, data: unknown) => data,
    ),
  };
  return {
    repository,
    service: createPublicationLifecycleService(repository as any),
  };
}
describe("publication lifecycle orchestration", () => {
  it("requires a processed document before submission and does not mutate on failure", async () => {
    const { service, repository } = setup("DRAFT", "FAILED");
    await expect(
      service.transition("paper", "READY_FOR_REVIEW", "author", "RESEARCHER"),
    ).rejects.toMatchObject({ status: 409 });
    expect(repository.transition).not.toHaveBeenCalled();
  });
  it("passes the expected old state to an atomic transition", async () => {
    const { service, repository } = setup("READY_FOR_REVIEW");
    await service.transition("paper", "PUBLISHED", "admin", "ADMIN");
    expect(repository.transition).toHaveBeenCalledWith(
      "paper",
      "READY_FOR_REVIEW",
      expect.objectContaining({
        workflowStatus: "PUBLISHED",
        publishedAt: expect.any(Date),
      }),
    );
  });
  it("prevents researchers publishing and rejects unknown records", async () => {
    const { service, repository } = setup("READY_FOR_REVIEW");
    await expect(
      service.transition("paper", "PUBLISHED", "author", "RESEARCHER"),
    ).rejects.toMatchObject({ status: 409 });
    repository.find.mockResolvedValueOnce(null as any);
    await expect(
      service.transition("missing", "PUBLISHED", "admin", "ADMIN"),
    ).rejects.toMatchObject({ status: 404 });
  });
});
