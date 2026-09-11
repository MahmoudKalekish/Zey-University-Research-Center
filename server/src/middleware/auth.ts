import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http.js";
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/, "");
  if (token) {
    try {
      req.user = jwt.verify(token, env.JWT_SECRET) as any;
    } catch {
      /* anonymous */
    }
  }
  next();
}
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/, "");
  if (!token) return next(new HttpError(401, "Authentication required"));
  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as any;
    next();
  } catch {
    return next(new HttpError(401, "Invalid or expired session"));
  }
}
export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) =>
    req.user && roles.includes(req.user.role)
      ? next()
      : next(new HttpError(403, "Access denied"));
