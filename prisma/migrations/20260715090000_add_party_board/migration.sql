-- Structured, resume-backed party-board posts. These tables deliberately do
-- not contain edit tokens, resume contact fields, or anonymous survey answers.

-- CreateEnum
CREATE TYPE "PartyPostKind" AS ENUM ('RECRUITING', 'LOOKING');

-- CreateEnum
CREATE TYPE "PartyPostStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "PartyApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "PartyTargetCadence" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "PartyPost" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(96) NOT NULL,
    "kind" "PartyPostKind" NOT NULL,
    "status" "PartyPostStatus" NOT NULL DEFAULT 'OPEN',
    "ownerResumeId" TEXT NOT NULL,
    "ownerResumeSlug" VARCHAR(96) NOT NULL,
    "ownerResumeVersionId" TEXT NOT NULL,
    "ownerCharacterOcid" VARCHAR(128) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "closedAt" TIMESTAMPTZ(3),

    CONSTRAINT "PartyPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyPostTarget" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "sourceBossKey" VARCHAR(128) NOT NULL,
    "sourceBossId" VARCHAR(96),
    "bossName" VARCHAR(96) NOT NULL,
    "cadence" "PartyTargetCadence",
    "bossMultiplierPercent" VARCHAR(40),
    "maxPartySize" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "PartyPostTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyApplication" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "applicantResumeId" TEXT NOT NULL,
    "applicantResumeSlug" VARCHAR(96) NOT NULL,
    "applicantResumeVersionId" TEXT NOT NULL,
    "applicantCharacterOcid" VARCHAR(128) NOT NULL,
    "status" "PartyApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "message" VARCHAR(240),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(3),

    CONSTRAINT "PartyApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartyPost_slug_key" ON "PartyPost"("slug");

-- CreateIndex
CREATE INDEX "PartyPost_status_expiresAt_createdAt_idx" ON "PartyPost"("status", "expiresAt", "createdAt");

-- CreateIndex
CREATE INDEX "PartyPost_ownerResumeId_status_idx" ON "PartyPost"("ownerResumeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PartyPostTarget_postId_sourceBossKey_key" ON "PartyPostTarget"("postId", "sourceBossKey");

-- CreateIndex
CREATE INDEX "PartyPostTarget_cadence_bossName_idx" ON "PartyPostTarget"("cadence", "bossName");

-- CreateIndex
CREATE INDEX "PartyPostTarget_postId_sortOrder_idx" ON "PartyPostTarget"("postId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PartyApplication_postId_applicantCharacterOcid_key" ON "PartyApplication"("postId", "applicantCharacterOcid");

-- CreateIndex
CREATE INDEX "PartyApplication_postId_status_createdAt_idx" ON "PartyApplication"("postId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PartyApplication_applicantResumeId_status_idx" ON "PartyApplication"("applicantResumeId", "status");

-- AddForeignKey
ALTER TABLE "PartyPost" ADD CONSTRAINT "PartyPost_ownerResumeVersionId_ownerResumeId_fkey" FOREIGN KEY ("ownerResumeVersionId", "ownerResumeId") REFERENCES "ResumeVersion"("id", "resumeId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyPostTarget" ADD CONSTRAINT "PartyPostTarget_postId_fkey" FOREIGN KEY ("postId") REFERENCES "PartyPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyApplication" ADD CONSTRAINT "PartyApplication_postId_fkey" FOREIGN KEY ("postId") REFERENCES "PartyPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyApplication" ADD CONSTRAINT "PartyApplication_applicantResumeVersionId_applicantResumeId_fkey" FOREIGN KEY ("applicantResumeVersionId", "applicantResumeId") REFERENCES "ResumeVersion"("id", "resumeId") ON DELETE CASCADE ON UPDATE CASCADE;
