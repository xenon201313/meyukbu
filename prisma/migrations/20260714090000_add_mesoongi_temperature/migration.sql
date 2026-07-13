-- CreateEnum
CREATE TYPE "TemperatureFeedbackStatus" AS ENUM ('PUBLISHED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "TemperatureInvitation" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "resumeVersionId" TEXT NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemperatureInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemperatureFeedback" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "resumeVersionId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "reviewerResumeId" TEXT NOT NULL,
    "reviewerSlug" VARCHAR(96) NOT NULL,
    "reviewerOcid" VARCHAR(128) NOT NULL,
    "reviewerName" VARCHAR(64) NOT NULL,
    "reviewerWorldName" VARCHAR(64),
    "reviewerClassName" VARCHAR(64),
    "tags" JSONB NOT NULL,
    "status" "TemperatureFeedbackStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMPTZ(3),

    CONSTRAINT "TemperatureFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResumeVersion_id_resumeId_key" ON "ResumeVersion"("id", "resumeId");
CREATE UNIQUE INDEX "TemperatureInvitation_tokenHash_key" ON "TemperatureInvitation"("tokenHash");
CREATE INDEX "TemperatureInvitation_resumeId_resumeVersionId_expiresAt_idx" ON "TemperatureInvitation"("resumeId", "resumeVersionId", "expiresAt");
CREATE INDEX "TemperatureInvitation_expiresAt_idx" ON "TemperatureInvitation"("expiresAt");
CREATE UNIQUE INDEX "TemperatureFeedback_invitationId_key" ON "TemperatureFeedback"("invitationId");
CREATE UNIQUE INDEX "TemperatureFeedback_resumeId_reviewerOcid_key" ON "TemperatureFeedback"("resumeId", "reviewerOcid");
CREATE INDEX "TemperatureFeedback_resumeVersionId_status_createdAt_idx" ON "TemperatureFeedback"("resumeVersionId", "status", "createdAt");
CREATE INDEX "TemperatureFeedback_reviewerResumeId_idx" ON "TemperatureFeedback"("reviewerResumeId");

-- AddForeignKey
ALTER TABLE "TemperatureInvitation" ADD CONSTRAINT "TemperatureInvitation_resumeVersionId_resumeId_fkey" FOREIGN KEY ("resumeVersionId", "resumeId") REFERENCES "ResumeVersion"("id", "resumeId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemperatureFeedback" ADD CONSTRAINT "TemperatureFeedback_resumeVersionId_resumeId_fkey" FOREIGN KEY ("resumeVersionId", "resumeId") REFERENCES "ResumeVersion"("id", "resumeId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemperatureFeedback" ADD CONSTRAINT "TemperatureFeedback_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "TemperatureInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TemperatureFeedback" ADD CONSTRAINT "TemperatureFeedback_reviewerResumeId_fkey" FOREIGN KEY ("reviewerResumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
