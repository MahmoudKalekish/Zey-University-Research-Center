CREATE TYPE "ApplicantCategory" AS ENUM ('STUDENT', 'FACULTY', 'RESEARCH_STAFF', 'EXTERNAL_COLLABORATOR');
CREATE TYPE "ResearcherApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "Publication" ADD COLUMN "authorAttestedAt" TIMESTAMP(3);

CREATE TABLE "ResearcherApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "applicantEmail" TEXT NOT NULL,
    "category" "ApplicantCategory" NOT NULL,
    "institution" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "institutionalEmail" TEXT NOT NULL,
    "institutionalReference" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "proposal" TEXT NOT NULL,
    "experience" TEXT NOT NULL,
    "benefit" TEXT NOT NULL,
    "keywords" TEXT[] NOT NULL,
    "status" "ResearcherApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResearcherApplication_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ResearcherApplication_userId_key" ON "ResearcherApplication"("userId");
CREATE INDEX "ResearcherApplication_status_createdAt_idx" ON "ResearcherApplication"("status", "createdAt");
CREATE INDEX "ResearcherApplication_areaId_idx" ON "ResearcherApplication"("areaId");
ALTER TABLE "ResearcherApplication" ADD CONSTRAINT "ResearcherApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResearcherApplication" ADD CONSTRAINT "ResearcherApplication_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "ResearchArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResearcherApplication" ADD CONSTRAINT "ResearcherApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
