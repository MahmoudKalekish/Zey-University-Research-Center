import { describe, it, expect } from "vitest";
import { slugify } from "./utils/http.js";
import { registerSchema } from "./validation/schemas.js";
describe("slugify", () =>
  it("normalizes research titles", () =>
    expect(slugify("Artificial Intelligence & Health")).toBe(
      "artificial-intelligence-health",
    )));

describe("registration validation", () => {
  const base = {
    firstName: "Test",
    lastName: "Researcher",
    email: "test@example.com",
  };

  it("explains when an uppercase letter is missing", () => {
    const result = registerSchema.safeParse({ ...base, password: "password1" });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.flatten().fieldErrors.password).toContain(
        "At least one uppercase letter is required",
      );
  });

  it("accepts a password satisfying every documented rule", () => {
    expect(
      registerSchema.safeParse({ ...base, password: "Password1" }).success,
    ).toBe(true);
  });
});
