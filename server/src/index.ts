import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/db.js";
import { startDocumentWorker } from "./services/documents/worker.service.js";
const stopDocumentWorker = env.NODE_ENV === "test" ? () => undefined : startDocumentWorker();
const server = app.listen(env.PORT, () =>
  console.log(`API available at http://localhost:${env.PORT}`),
);
const shutdown = async () => {
  stopDocumentWorker();
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
