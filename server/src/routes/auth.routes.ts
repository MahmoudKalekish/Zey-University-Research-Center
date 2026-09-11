import { Router } from "express";
import { asyncHandler } from "../utils/http.js";
import { loginSchema, registerSchema } from "../validation/schemas.js";
import * as auth from "../services/auth.service.js";
import { authenticate } from "../middleware/auth.js";
import { prisma } from "../config/db.js";
export const authRouter = Router();
authRouter.post(
  "/login",
  asyncHandler(async (req: any, res: any) =>
    res.json(
      await auth.login(
        ...(Object.values(loginSchema.parse(req.body)) as [string, string]),
      ),
    ),
  ),
);
authRouter.post(
  "/register",
  asyncHandler(async (req: any, res: any) =>
    res.status(201).json(await auth.register(registerSchema.parse(req.body))),
  ),
);
authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req: any, res: any) =>
    res.json(
      await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          researcher: true,
        },
      }),
    ),
  ),
);
