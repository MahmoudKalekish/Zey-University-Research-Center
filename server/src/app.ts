import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { optionalAuth } from "./middleware/auth.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { publicRouter } from "./routes/public.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { researcherRouter } from "./routes/researcher.routes.js";
import {
  adminPublicationDocumentRouter,
  publicationDocumentRouter,
  researcherPublicationDocumentRouter,
} from "./routes/publication-document.routes.js";
export const app = express();
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      const localDevelopmentOrigin =
        env.NODE_ENV === "development" &&
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || "");
      if (!origin || origin === env.CLIENT_URL || localDevelopmentOrigin) {
        return callback(null, true);
      }
      callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(optionalAuth);
app.get("/api/health", (_q, r) => r.json({ status: "ok" }));
app.use("/api/auth", authRouter);
app.use("/api/publications", publicationDocumentRouter);
app.use("/api/admin", adminPublicationDocumentRouter, adminRouter);
app.use(
  "/api/researcher",
  researcherPublicationDocumentRouter,
  researcherRouter,
);
app.use("/api", publicRouter);
app.use(notFound);
app.use(errorHandler);
