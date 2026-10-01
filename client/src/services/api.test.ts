import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "./api";
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});
const respond = (body: unknown, status = 200) =>
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(status === 204 ? null : JSON.stringify(body), { status }),
      ),
  );
describe("API transport", () => {
  it("keeps JSON and bearer authentication headers", async () => {
    localStorage.setItem("token", "local-token");
    respond({ ok: true });
    await api("/test", { method: "POST", body: JSON.stringify({}) });
    const headers = new Headers(vi.mocked(fetch).mock.calls[0]![1]?.headers);
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("authorization")).toBe("Bearer local-token");
  });
  it("lets the browser supply multipart boundaries for PDF uploads", async () => {
    respond({ status: "PENDING" }, 202);
    const body = new FormData();
    body.append(
      "document",
      new File(["%PDF-"], "paper.pdf", { type: "application/pdf" }),
    );
    expect(await api("/upload", { method: "POST", body })).toEqual({
      status: "PENDING",
    });
    const headers = new Headers(vi.mocked(fetch).mock.calls[0]![1]?.headers);
    expect(headers.has("content-type")).toBe(false);
  });
  it("supports 204 responses and preserves field errors", async () => {
    respond(null, 204);
    expect(await api("/delete")).toBeUndefined();
    respond(
      { message: "Processing unavailable", errors: { document: ["Retry"] } },
      503,
    );
    await expect(api("/upload")).rejects.toMatchObject({
      status: 503,
      fieldErrors: { document: ["Retry"] },
    });
    expect(new ApiError("Forbidden", 403).status).toBe(403);
  });
});
