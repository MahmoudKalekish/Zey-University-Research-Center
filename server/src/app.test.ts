import { describe, it, expect } from "vitest";
import { slugify } from "./utils/http.js";
import { registerSchema } from "./validation/schemas.js";
import { projectStatusFromQuery, searchTerms } from "./services/search.service.js";
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

describe("research assistant query interpretation", () => {
  it("expands short research abbreviations", () => {
    expect(searchTerms("Find AI and NLP papers")).toEqual(
      expect.arrayContaining(["artificial intelligence", "natural language"]),
    );
  });

  it("recognizes project lifecycle questions", () => {
    expect(projectStatusFromQuery("Which projects are currently active?")).toBe(
      "ACTIVE",
    );
    expect(projectStatusFromQuery("Show completed projects")).toBe("COMPLETED");
  });
});
