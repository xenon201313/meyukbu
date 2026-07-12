-- CreateEnum
CREATE TYPE "SnapshotProvider" AS ENUM ('MOCK', 'NEXON_OPEN_API');

-- CreateEnum
CREATE TYPE "SnapshotFreshness" AS ENUM ('FRESH', 'STALE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DataProvenance" AS ENUM ('NEXON_API', 'SERVICE_CALCULATED', 'USER_PROVIDED', 'SERVICE_OBSERVED');

-- CreateEnum
CREATE TYPE "ResumeVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ResumeTheme" AS ENUM ('RESUME', 'MINIMAL');

-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('IMPERSONATION', 'PRIVACY', 'HARASSMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportState" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "ocid" VARCHAR(128) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "worldName" VARCHAR(64),
    "firstSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileSnapshot" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "fetchedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceDate" VARCHAR(32),
    "provider" "SnapshotProvider" NOT NULL,
    "normalized" JSONB NOT NULL,
    "rawPayload" JSONB,
    "rawAvailability" JSONB NOT NULL,
    "freshness" "SnapshotFreshness" NOT NULL DEFAULT 'FRESH',
    "freshUntil" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "contentHash" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(96) NOT NULL,
    "characterId" TEXT NOT NULL,
    "currentVersionId" TEXT,
    "visibility" "ResumeVisibility" NOT NULL DEFAULT 'PUBLIC',
    "editTokenHash" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "withdrawnAt" TIMESTAMPTZ(3),

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeVersion" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "userInput" JSONB NOT NULL,
    "theme" "ResumeTheme" NOT NULL DEFAULT 'RESUME',
    "contentHash" VARCHAR(64) NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "publishedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalculatedMetric" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "resumeVersionId" TEXT,
    "key" VARCHAR(96) NOT NULL,
    "value" VARCHAR(128) NOT NULL,
    "unit" VARCHAR(32),
    "provenance" "DataProvenance" NOT NULL DEFAULT 'SERVICE_CALCULATED',
    "algorithmName" VARCHAR(128) NOT NULL,
    "algorithmVersion" VARCHAR(64) NOT NULL,
    "inputs" JSONB NOT NULL,
    "includedFields" JSONB NOT NULL,
    "excludedFields" JSONB NOT NULL,
    "disclaimer" TEXT NOT NULL,
    "calculatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalculatedMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildObservation" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "guildName" VARCHAR(64),
    "provenance" "DataProvenance" NOT NULL DEFAULT 'SERVICE_OBSERVED',
    "observedFrom" TIMESTAMPTZ(3) NOT NULL,
    "lastObservedAt" TIMESTAMPTZ(3) NOT NULL,
    "observedTo" TIMESTAMPTZ(3),
    "sourceSnapshotId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "GuildObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "category" "ReportCategory" NOT NULL,
    "detail" VARCHAR(1000),
    "state" "ReportState" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Character_ocid_key" ON "Character"("ocid");
CREATE INDEX "Character_name_idx" ON "Character"("name");
CREATE INDEX "Character_lastSeenAt_idx" ON "Character"("lastSeenAt");
CREATE INDEX "ProfileSnapshot_characterId_fetchedAt_idx" ON "ProfileSnapshot"("characterId", "fetchedAt");
CREATE INDEX "ProfileSnapshot_freshness_expiresAt_idx" ON "ProfileSnapshot"("freshness", "expiresAt");
CREATE INDEX "ProfileSnapshot_contentHash_idx" ON "ProfileSnapshot"("contentHash");
CREATE UNIQUE INDEX "Resume_slug_key" ON "Resume"("slug");
CREATE UNIQUE INDEX "Resume_currentVersionId_key" ON "Resume"("currentVersionId");
CREATE INDEX "Resume_characterId_idx" ON "Resume"("characterId");
CREATE INDEX "Resume_visibility_updatedAt_idx" ON "Resume"("visibility", "updatedAt");
CREATE INDEX "ResumeVersion_snapshotId_idx" ON "ResumeVersion"("snapshotId");
CREATE INDEX "ResumeVersion_contentHash_idx" ON "ResumeVersion"("contentHash");
CREATE UNIQUE INDEX "ResumeVersion_resumeId_versionNumber_key" ON "ResumeVersion"("resumeId", "versionNumber");
CREATE INDEX "CalculatedMetric_snapshotId_idx" ON "CalculatedMetric"("snapshotId");
CREATE UNIQUE INDEX "CalculatedMetric_resumeVersionId_key_key" ON "CalculatedMetric"("resumeVersionId", "key");
CREATE INDEX "GuildObservation_characterId_observedTo_idx" ON "GuildObservation"("characterId", "observedTo");
CREATE INDEX "GuildObservation_sourceSnapshotId_idx" ON "GuildObservation"("sourceSnapshotId");
CREATE INDEX "Report_resumeId_state_idx" ON "Report"("resumeId", "state");
CREATE INDEX "Report_state_createdAt_idx" ON "Report"("state", "createdAt");

-- AddForeignKey
ALTER TABLE "ProfileSnapshot" ADD CONSTRAINT "ProfileSnapshot_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "ResumeVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ProfileSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CalculatedMetric" ADD CONSTRAINT "CalculatedMetric_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "ProfileSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalculatedMetric" ADD CONSTRAINT "CalculatedMetric_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "ResumeVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuildObservation" ADD CONSTRAINT "GuildObservation_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuildObservation" ADD CONSTRAINT "GuildObservation_sourceSnapshotId_fkey" FOREIGN KEY ("sourceSnapshotId") REFERENCES "ProfileSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
