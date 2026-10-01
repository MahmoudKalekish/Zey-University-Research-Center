import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/db.js";
import { HttpError } from "../utils/http.js";

function verifiedUserId(token: string) {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    return typeof payload !== "string" && typeof payload.id === "string"
      ? payload.id
      : null;
  } catch {
    return null;
  }
}
async function currentIdentity(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, active: true },
  });
  if (!user?.active) throw new HttpError(403, "Active account required");
  return { id: user.id, email: user.email, role: user.role };
}
export function optionalAuth(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/, "");
  const userId = token ? verifiedUserId(token) : null;
  if (!userId) return next();
  void currentIdentity(userId)
    .then((identity) => {
      request.user = identity;
      next();
    })
    .catch(next);
}
export function authenticate(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/, "");
  if (!token) return next(new HttpError(401, "Authentication required"));
  const userId = verifiedUserId(token);
  if (!userId) return next(new HttpError(401, "Invalid or expired session"));
  void currentIdentity(userId)
    .then((identity) => {
      request.user = identity;
      next();
    })
    .catch(next);
}
export const authorize =
  (...roles: Role[]) =>
  (request: Request, _response: Response, next: NextFunction) =>
    request.user && roles.includes(request.user.role)
      ? next()
      : next(new HttpError(403, "Access denied"));
