-- Preserve the original named tag feedback tables. Anonymous temperature
-- surveys are deliberately stored in new character-scoped tables instead.
CREATE TABLE "TemperatureSurveyInvitation" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemperatureSurveyInvitation_pkey" PRIMARY KEY ("id")
);

-- There is intentionally no reviewer character, resume, name, contact, or
-- request fingerprint column in this table. A submitted response is anonymous.
CREATE TABLE "TemperatureSurveyResponse" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "experienceScore" INTEGER NOT NULL,
    "proficiencyScore" INTEGER NOT NULL,
    "punctualityScore" INTEGER NOT NULL,
    "totalDelta" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemperatureSurveyResponse_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TemperatureSurveyResponse_experienceScore_check" CHECK ("experienceScore" BETWEEN -2 AND 2),
    CONSTRAINT "TemperatureSurveyResponse_proficiencyScore_check" CHECK ("proficiencyScore" BETWEEN -2 AND 2),
    CONSTRAINT "TemperatureSurveyResponse_punctualityScore_check" CHECK ("punctualityScore" IN (-1, 1)),
    CONSTRAINT "TemperatureSurveyResponse_totalDelta_check" CHECK (
      "totalDelta" = "experienceScore" + "proficiencyScore" + "punctualityScore"
      AND "totalDelta" BETWEEN -5 AND 5
    )
);

CREATE UNIQUE INDEX "TemperatureSurveyInvitation_tokenHash_key" ON "TemperatureSurveyInvitation"("tokenHash");
CREATE INDEX "TemperatureSurveyInvitation_characterId_expiresAt_idx" ON "TemperatureSurveyInvitation"("characterId", "expiresAt");
CREATE INDEX "TemperatureSurveyInvitation_expiresAt_idx" ON "TemperatureSurveyInvitation"("expiresAt");
CREATE UNIQUE INDEX "TemperatureSurveyResponse_invitationId_key" ON "TemperatureSurveyResponse"("invitationId");
CREATE INDEX "TemperatureSurveyResponse_characterId_createdAt_idx" ON "TemperatureSurveyResponse"("characterId", "createdAt");

ALTER TABLE "TemperatureSurveyInvitation"
  ADD CONSTRAINT "TemperatureSurveyInvitation_characterId_fkey"
  FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TemperatureSurveyResponse"
  ADD CONSTRAINT "TemperatureSurveyResponse_characterId_fkey"
  FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TemperatureSurveyResponse"
  ADD CONSTRAINT "TemperatureSurveyResponse_invitationId_fkey"
  FOREIGN KEY ("invitationId") REFERENCES "TemperatureSurveyInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
