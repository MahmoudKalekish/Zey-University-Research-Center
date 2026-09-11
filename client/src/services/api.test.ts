import { describe, expect, it } from "vitest";
import { ApiError } from "./api";

describe("ApiError", () => {
  it("preserves the HTTP status", () => {
    const error = new ApiError("Forbidden", 403);
    expect(error.message).toBe("Forbidden");
    expect(error.status).toBe(403);
    expect(error.fieldErrors).toEqual({});
  });

  it("preserves field validation messages", () => {
    const error = new ApiError("Password is invalid", 422, {
      password: ["At least one uppercase letter is required"],
    });
    expect(error.fieldErrors.password[0]).toBe(
      "At least one uppercase letter is required",
    );
  });
});
