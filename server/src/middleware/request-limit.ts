import type { RequestHandler } from "express";
import { HttpError } from "../utils/http.js";

// Bounded, per-process limit for the single API process. Entries expire automatically.
export function requestLimit(
  maximum: number,
  windowMs: number,
): RequestHandler {
  const attempts = new Map<string, { count: number; expires: number }>();
  let nextCleanup = 0;
  return (req, res, next) => {
    const now = Date.now();
    if (now >= nextCleanup) {
      for (const [key, value] of attempts)
        if (value.expires <= now) attempts.delete(key);
      nextCleanup = now + 60000;
    }
    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
    let entry = attempts.get(key);
    if (!entry || entry.expires <= now) {
      if (!entry && attempts.size >= 10000)
        return next(new HttpError(429, "Please try again later."));
      entry = { count: 0, expires: now + windowMs };
      attempts.set(key, entry);
    }
    if (++entry.count > maximum) {
      res.set("Retry-After", String(Math.ceil((entry.expires - now) / 1000)));
      return next(
        new HttpError(429, "Too many attempts. Please try again later."),
      );
    }
    next();
  };
}
