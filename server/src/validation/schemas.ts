import { z } from "zod";
const passwordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters")
  .regex(/[A-Z]/, "At least one uppercase letter is required")
  .regex(/[0-9]/, "At least one number is required");
export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must contain at least 8 characters"),
});
export const registerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "First name must contain at least 2 characters")
    .max(60),
  lastName: z
    .string()
    .trim()
    .min(2, "Last name must contain at least 2 characters")
    .max(60),
  email: z.string().email("Enter a valid email address"),
  password: passwordSchema,
});
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(100),
  email: z.string().email("Enter a valid email address"),
  subject: z
    .string()
    .trim()
    .min(3, "Subject must contain at least 3 characters")
    .max(150),
  message: z
    .string()
    .trim()
    .min(10, "Message must contain at least 10 characters")
    .max(5000),
});
export const chatSchema = z.object({
  question: z.string().min(3).max(1000),
  sessionId: z.string().min(8).max(100),
});
export const documentQuestionSchema = z.object({
  question: z.string().trim().min(3).max(1000),
  sessionId: z.string().uuid(),
});
export const summaryRequestSchema = z.object({
  detailLevel: z.enum(["SHORT", "STANDARD", "DETAILED"]).default("STANDARD"),
});
export const publicationReturnSchema = z.object({
  reviewNote: z
    .string()
    .trim()
    .min(5, "A review note of at least 5 characters is required")
    .max(2000),
});
export const userSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  firstName: z
    .string()
    .trim()
    .min(2, "First name must contain at least 2 characters"),
  lastName: z
    .string()
    .trim()
    .min(2, "Last name must contain at least 2 characters"),
  role: z.enum(["VISITOR", "RESEARCHER", "ADMIN"]),
  active: z.boolean().default(true),
  password: passwordSchema.optional(),
});
export const areaSchema = z.object({
  name: z.string().trim().min(2, "Name must contain at least 2 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Description must contain at least 10 characters"),
  icon: z.string().default("FlaskConical"),
  imageUrl: z.string().url().nullable().optional(),
  objectives: z.array(z.string()).default([]),
});
export const researcherSchema = z.object({
  name: z.string().trim().min(2, "Name must contain at least 2 characters"),
  biography: z
    .string()
    .trim()
    .min(20, "Biography must contain at least 20 characters"),
  position: z
    .string()
    .trim()
    .min(2, "Position must contain at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  photoUrl: z.string().url().nullable().optional(),
  affiliation: z
    .string()
    .trim()
    .min(2, "Affiliation must contain at least 2 characters"),
  orcid: z.string().nullable().optional(),
  linkedInUrl: z.string().url().nullable().optional(),
  scholarUrl: z.string().url().nullable().optional(),
  interests: z.array(z.string()).default([]),
  active: z.boolean().default(true),
  areaIds: z.array(z.string()).default([]),
});
export const projectSchema = z.object({
  title: z.string().trim().min(3, "Title must contain at least 3 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Description must contain at least 10 characters"),
  abstract: z
    .string()
    .trim()
    .min(20, "Abstract must contain at least 20 characters"),
  objectives: z.array(z.string()),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  status: z.enum(["PLANNED", "ACTIVE", "COMPLETED", "SUSPENDED"]),
  funding: z.string().nullable().optional(),
  featured: z.boolean().default(false),
  areaIds: z.array(z.string()).default([]),
  researcherIds: z.array(z.string()).default([]),
});
export const publicationSchema = z.object({
  title: z.string().trim().min(3, "Title must contain at least 3 characters"),
  abstract: z
    .string()
    .trim()
    .min(20, "Abstract must contain at least 20 characters"),
  publicationDate: z.coerce.date(),
  doi: z.string().nullable().optional(),
  venue: z
    .string()
    .trim()
    .min(2, "Journal or conference must contain at least 2 characters"),
  keywords: z.array(z.string()),
  type: z.enum([
    "JOURNAL_ARTICLE",
    "CONFERENCE_PAPER",
    "BOOK_CHAPTER",
    "THESIS",
    "REPORT",
    "DATASET",
  ]),
  pdfUrl: z.string().url().nullable().optional(),
  externalUrl: z.string().url().nullable().optional(),
  featured: z.boolean().default(false),
  projectId: z.string().nullable().optional(),
  areaIds: z.array(z.string()).default([]),
  authorIds: z.array(z.string()).min(1),
});
export const researcherPublicationDraftSchema = publicationSchema.omit({
  authorIds: true,
});
