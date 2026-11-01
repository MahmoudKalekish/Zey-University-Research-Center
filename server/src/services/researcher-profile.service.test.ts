import type { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureResearcherProfile } from "./researcher-profile.service.js";

const user = {
  id: "user-1",
  email: "New@zurc.test",
  firstName: "New",
  lastName: "Researcher",
};
const researcher = {
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};
const tx = { researcher } as unknown as Prisma.TransactionClient;

beforeEach(() => {
  vi.resetAllMocks();
  researcher.findUnique.mockResolvedValue(null);
  researcher.findFirst.mockResolvedValue(null);
});

describe("researcher account provisioning", () => {
  it("creates a linked profile with usable defaults and a distinct slug for namesakes", async () => {
    await ensureResearcherProfile(tx, user);
    const first = researcher.create.mock.calls[0]![0].data;
    expect(first).toMatchObject({
      userId: user.id,
      email: "new@zurc.test",
      name: "New Researcher",
      position: "Researcher",
      interests: [],
    });
    await ensureResearcherProfile(tx, { ...user, id: "user-2" });
    expect(researcher.create.mock.calls[1]![0].data.slug).not.toBe(first.slug);
  });

  it("preserves an existing linked profile and its publications on repeat promotion", async () => {
    const linked = {
      id: "profile",
      userId: user.id,
      biography: "Existing biography",
    };
    researcher.findUnique.mockResolvedValue(linked);
    expect(await ensureResearcherProfile(tx, user)).toBe(linked);
    expect(researcher.create).not.toHaveBeenCalled();
    expect(researcher.update).not.toHaveBeenCalled();
  });

  it("links a matching unclaimed profile without overwriting its content", async () => {
    researcher.findFirst.mockResolvedValue({ id: "existing", userId: null });
    await ensureResearcherProfile(tx, user);
    expect(researcher.findFirst).toHaveBeenCalledWith({
      where: { email: { equals: user.email, mode: "insensitive" } },
    });
    expect(researcher.update).toHaveBeenCalledWith({
      where: { id: "existing" },
      data: { userId: user.id },
    });
    expect(researcher.create).not.toHaveBeenCalled();
  });

  it("rejects taking another account's profile", async () => {
    researcher.findFirst.mockResolvedValue({
      id: "existing",
      userId: "other-user",
    });
    await expect(ensureResearcherProfile(tx, user)).rejects.toMatchObject({
      status: 409,
    });
    expect(researcher.update).not.toHaveBeenCalled();
    expect(researcher.create).not.toHaveBeenCalled();
  });
});
