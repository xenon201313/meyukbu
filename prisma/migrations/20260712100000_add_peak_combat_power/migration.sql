-- AlterTable
ALTER TABLE "Character" ADD COLUMN "peakCombatPower" BIGINT,
ADD COLUMN "peakCombatPowerAt" TIMESTAMPTZ(3);
