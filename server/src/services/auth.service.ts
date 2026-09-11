import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http.js";
const token = (u: { id: string; email: string; role: any }) =>
  jwt.sign({ id: u.id, email: u.email, role: u.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { researcher: true },
  });
  if (
    !user ||
    !user.active ||
    !(await bcrypt.compare(password, user.passwordHash))
  )
    throw new HttpError(401, "Incorrect email or password");
  return {
    token: token(user),
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      researcher: user.researcher,
    },
  };
}
export async function register(data: any) {
  if (
    await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } })
  )
    throw new HttpError(409, "This email address is already in use");
  const user = await prisma.user.create({
    data: {
      ...data,
      email: data.email.toLowerCase(),
      passwordHash: await bcrypt.hash(data.password, 12),
      password: undefined,
      role: "VISITOR",
    },
  } as any);
  return {
    token: token(user),
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  };
}
