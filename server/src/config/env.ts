import "dotenv/config";
import { z } from "zod";
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("8h"),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  OLLAMA_URL: z.string().url().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("qwen2.5:0.5b"),
  OLLAMA_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(60000),
  DOCUMENT_SUMMARY_BATCH_CHARS: z.coerce.number().int().min(2000).max(12000).default(8000),
  PUBLICATION_STORAGE_DIR: z.string().min(1).default("storage/publications"),
  MAX_PUBLICATION_PDF_MB: z.coerce.number().int().min(1).max(100).default(25),
});
export const env = schema.parse(process.env);
