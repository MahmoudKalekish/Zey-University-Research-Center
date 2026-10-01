import { z } from "zod";
import { afterEach, describe, expect, it } from "vitest";
import { env } from "../../config/env.js";
import { createLocalJsonGenerator, LocalGenerationError } from "./ollama.service.js";

const outputSchema = z.object({ answer: z.string().min(1), pages: z.array(z.number().int()) });

describe("local Ollama JSON boundary", () => {
  const originalTimeout = env.OLLAMA_TIMEOUT_MS;
  afterEach(() => {
    env.OLLAMA_TIMEOUT_MS = originalTimeout;
  });

  it("uses only the configured local endpoint with bounded deterministic options", async () => {
    const calls: Array<[string | URL | Request, RequestInit | undefined]> = [];
    const fetcher: typeof fetch = async (url, request) => {
      calls.push([url, request]);
      return new Response(JSON.stringify({ response: '{"answer":"Grounded","pages":[2]}' }), { status: 200 });
    };
    const generate = createLocalJsonGenerator(fetcher);
    await expect(generate("Use document evidence", outputSchema, { maxOutputTokens: 700 })).resolves.toEqual({ answer: "Grounded", pages: [2] });
    expect(calls).toHaveLength(1);
    const [url, request] = calls[0]!;
    expect(url).toBe(`${env.OLLAMA_URL}/api/generate`);
    const body = JSON.parse(String(request?.body));
    expect(body.model).toBe(env.OLLAMA_MODEL);
    expect(body.stream).toBe(false);
    expect(body.format).toBe("json");
    expect(body.options).toMatchObject({ temperature: 0.1, num_ctx: 4096, num_predict: 700 });
  });

  it("rejects malformed JSON, schema-invalid output, and non-success responses", async () => {
    const malformed = createLocalJsonGenerator(async () => new Response(JSON.stringify({ response: "not json" }), { status: 200 }));
    await expect(malformed("prompt", outputSchema)).rejects.toMatchObject({ code: "INVALID_JSON" });
    const invalid = createLocalJsonGenerator(async () => new Response(JSON.stringify({ response: '{"answer":"ok"}' }), { status: 200 }));
    await expect(invalid("prompt", outputSchema)).rejects.toMatchObject({ code: "INVALID_OUTPUT" });
    const unavailable = createLocalJsonGenerator(async () => new Response("offline", { status: 503 }));
    await expect(unavailable("prompt", outputSchema)).rejects.toMatchObject({ code: "OLLAMA_UNAVAILABLE" });
  });

  it("times out a stalled local generation request", async () => {
    env.OLLAMA_TIMEOUT_MS = 10;
    const stalled = createLocalJsonGenerator((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(options.signal?.reason));
    }));
    await expect(stalled("prompt", outputSchema)).rejects.toBeInstanceOf(LocalGenerationError);
    await expect(stalled("prompt", outputSchema)).rejects.toMatchObject({ code: "OLLAMA_TIMEOUT" });
  });
});
