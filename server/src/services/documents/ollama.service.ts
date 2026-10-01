import { z } from "zod";
import { env } from "../../config/env.js";

export type LocalGenerationErrorCode =
  | "OLLAMA_UNAVAILABLE"
  | "OLLAMA_TIMEOUT"
  | "INVALID_JSON"
  | "INVALID_OUTPUT";

export class LocalGenerationError extends Error {
  constructor(public code: LocalGenerationErrorCode, message: string) {
    super(message);
  }
}

interface GenerationOptions {
  maxOutputTokens?: number;
}

function ensureLocalEndpoint(value: string) {
  const url = new URL(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const isLocal =
    hostname === "localhost" ||
    hostname === "::1" ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    !hostname.includes(".");
  if (!isLocal || url.protocol !== "http:") {
    throw new LocalGenerationError("OLLAMA_UNAVAILABLE", "OLLAMA_URL must reference a local HTTP service");
  }
  return url.toString().replace(/\/$/, "");
}

export function createLocalJsonGenerator(fetcher: typeof fetch) {
  return async function generateLocalJson<T>(
    prompt: string,
    schema: z.ZodType<T>,
    options: GenerationOptions = {},
  ): Promise<T> {
    const endpoint = ensureLocalEndpoint(env.OLLAMA_URL);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new DOMException("Local generation timed out", "TimeoutError")), env.OLLAMA_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetcher(`${endpoint}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: env.OLLAMA_MODEL,
          stream: false,
          format: "json",
          prompt,
          options: {
            temperature: 0.1,
            num_ctx: 4096,
            num_predict: Math.min(Math.max(options.maxOutputTokens ?? 900, 64), 1200),
          },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      const timedOut = controller.signal.aborted || (error instanceof Error && error.name === "TimeoutError");
      throw new LocalGenerationError(
        timedOut ? "OLLAMA_TIMEOUT" : "OLLAMA_UNAVAILABLE",
        timedOut ? "Local Ollama generation timed out" : "Local Ollama is unavailable",
      );
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      throw new LocalGenerationError("OLLAMA_UNAVAILABLE", `Local Ollama returned HTTP ${response.status}`);
    }
    const envelope = z.object({ response: z.string() }).safeParse(await response.json().catch(() => null));
    if (!envelope.success) throw new LocalGenerationError("INVALID_JSON", "Ollama returned an invalid response envelope");
    let parsed: unknown;
    try {
      parsed = JSON.parse(envelope.data.response);
    } catch {
      throw new LocalGenerationError("INVALID_JSON", "Ollama did not return valid JSON");
    }
    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      throw new LocalGenerationError("INVALID_OUTPUT", "Ollama JSON did not match the required academic summary structure");
    }
    return validated.data;
  };
}

export const generateLocalJson = createLocalJsonGenerator(fetch);
