import type { Prisma } from "@prisma/client";
import { HttpError, slugify } from "../utils/http.js";

type ResearcherAccount = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

// Run inside the same transaction as the administrator's account change.
export async function ensureResearcherProfile(
  tx: Prisma.TransactionClient,
  user: ResearcherAccount,
) {
  const linked = await tx.researcher.findUnique({ where: { userId: user.id } });
  if (linked) return linked;

  const existing = await tx.researcher.findFirst({
    where: { email: { equals: user.email, mode: "insensitive" } },
  });
  if (existing) {
    if (existing.userId && existing.userId !== user.id)
      throw new HttpError(
        409,
        "This researcher profile is linked to another account",
      );
    return tx.researcher.update({
      where: { id: existing.id },
      data: { userId: user.id },
    });
  }

  const name = `${user.firstName} ${user.lastName}`.trim();
  return tx.researcher.create({
    data: {
      userId: user.id,
      name,
      email: user.email.toLowerCase(),
      slug: `${slugify(name) || "researcher"}-${user.id}`,
      position: "Researcher",
      biography: "",
      affiliation: "",
      interests: [],
    },
  });
}
