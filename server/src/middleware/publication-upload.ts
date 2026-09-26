import type { RequestHandler } from "express";
import multer from "multer";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_PUBLICATION_PDF_MB * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const validName = file.originalname.toLowerCase().endsWith(".pdf");
    const validMime = file.mimetype.toLowerCase() === "application/pdf";
    if (!validName || !validMime) {
      callback(new HttpError(415, "Only PDF documents are accepted"));
      return;
    }
    callback(null, true);
  },
}).single("document");

export const publicationPdfUpload: RequestHandler = (request, response, next) => {
  upload(request, response, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(new HttpError(413, `The PDF exceeds the ${env.MAX_PUBLICATION_PDF_MB} MiB limit`));
        return;
      }
      next(new HttpError(422, "Upload exactly one PDF in the document field"));
      return;
    }
    next(error);
  });
};
