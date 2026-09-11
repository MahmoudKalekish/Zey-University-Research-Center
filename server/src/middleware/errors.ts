import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { HttpError } from "../utils/http.js";
export const notFound: RequestHandler = (_req, _res, next) =>
  next(new HttpError(404, "Resource not found"));
export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  void next;
  if (err instanceof ZodError) {
    const fieldErrors = err.flatten().fieldErrors;
    const first = err.issues[0] ?? {
      path: [],
      message: "Please review the submitted values.",
    };
    const field = first.path[0]
      ? String(first.path[0])
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (letter) => letter.toUpperCase())
      : "Form";
    return res.status(422).json({
      message: `${field}: ${first.message}`,
      errors: fieldErrors,
    });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002")
      return res.status(409).json({
        message: "A record with this unique value already exists.",
      });
    if (err.code === "P2025")
      return res
        .status(404)
        .json({ message: "The requested record was not found." });
    if (err.code === "P2003")
      return res.status(409).json({
        message:
          "This record is still referenced by other data and cannot be deleted.",
      });
  }
  const status = err instanceof HttpError ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({
    message: status === 500 ? "An internal server error occurred" : err.message,
    details: err.details,
  });
};
