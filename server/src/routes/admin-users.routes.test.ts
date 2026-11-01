import express from "express";
import type { Server } from "node:http";
import request from "supertest";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { adminRouter } from "./admin.routes.js";
import { errorHandler } from "../middleware/errors.js";

const db = vi.hoisted(() => ({
  user: { create: vi.fn(), update: vi.fn() },
  researcher: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}));
vi.mock("../config/db.js", () => ({ prisma: db }));
vi.mock("../middleware/auth.js", () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
  authorize: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
const account = {
  id: "new-user",
  email: "new@zurc.test",
  firstName: "New",
  lastName: "User",
  role: "RESEARCHER",
  active: true,
};
const app = express();
app.use(express.json());
app.use("/admin", adminRouter);
app.use(errorHandler);
let server: Server;
beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
    server.once("error", reject);
  });
});
afterAll(async () => {
  if (server?.listening)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
});

beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation(async (callback) => callback(db));
  db.user.update.mockResolvedValue(account);
  db.user.create.mockResolvedValue(account);
  db.researcher.findUnique.mockResolvedValue(null);
  db.researcher.findFirst.mockResolvedValue(null);
  db.researcher.create.mockResolvedValue({ id: "profile", userId: account.id });
});

describe("administrator role changes", () => {
  it("provisions a profile in the same transaction when promoting a visitor", async () => {
    const response = await request(server)
      .put(`/admin/users/${account.id}`)
      .send({ role: "RESEARCHER" });
    expect(response.status).toBe(200);
    expect(response.body.role).toBe("RESEARCHER");
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "RESEARCHER" }),
      }),
    );
    expect(db.researcher.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: account.id,
        email: account.email,
      }),
    });
    expect(response.body.passwordHash).toBeUndefined();
  });

  it("also provisions an administrator-created researcher account", async () => {
    const response = await request(server)
      .post("/admin/users")
      .send({ ...account, password: "Research123!" });
    expect(response.status).toBe(201);
    expect(db.researcher.create).toHaveBeenCalledOnce();
  });

  it("preserves a profile on demotion and does not give a visitor a new profile", async () => {
    db.user.update.mockResolvedValue({ ...account, role: "VISITOR" });
    const response = await request(server)
      .put(`/admin/users/${account.id}`)
      .send({ role: "VISITOR" });
    expect(response.status).toBe(200);
    expect(db.researcher.findUnique).not.toHaveBeenCalled();
    expect(db.researcher.create).not.toHaveBeenCalled();
  });

  it("does not report a successful promotion if a matching profile belongs to another user", async () => {
    db.researcher.findFirst.mockResolvedValue({
      id: "profile",
      userId: "other-user",
    });
    const response = await request(server)
      .put(`/admin/users/${account.id}`)
      .send({ role: "RESEARCHER" });
    expect(response.status).toBe(409);
    expect(db.researcher.update).not.toHaveBeenCalled();
  });
});
