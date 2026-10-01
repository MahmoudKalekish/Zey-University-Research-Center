import { describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { env } from "../config/env.js";
import { authenticate } from "./auth.js";
import { prisma } from "../config/db.js";
vi.mock("../config/db.js", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));
function check(active: boolean, role = "RESEARCHER") {
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: "user",
    email: "user@zurc.test",
    role,
    active,
  } as any);
  const token = jwt.sign(
    { id: "user", email: "user@zurc.test", role: "ADMIN" },
    env.JWT_SECRET,
  );
  const request = { headers: { authorization: `Bearer ${token}` } } as Request;
  return new Promise<{ request: Request; error: any }>((resolve) => {
    authenticate(request, {} as Response, (error) =>
      resolve({ request, error }),
    );
  });
}
describe("authenticated identity", () => {
  it("uses the current database role instead of a stale administrator claim", async () => {
    const result = await check(true);
    expect(result.error).toBeUndefined();
    expect(result.request.user?.role).toBe("RESEARCHER");
  });
  it("rejects a deactivated account even with a valid token", async () => {
    expect((await check(false)).error).toMatchObject({ status: 403 });
  });
});
