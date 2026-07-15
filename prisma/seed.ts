import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HOUR = 60 * 60 * 1000;

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

async function seedResume(input: {
  characterId: string;
  snapshotId: string;
  slug: string;
  editTokenHash: string;
  userInput: Prisma.InputJsonObject;
}): Promise<void> {
  const resume = await prisma.resume.upsert({
    where: { slug: input.slug },
    update: {
      characterId: input.characterId,
      editTokenHash: input.editTokenHash,
      visibility: "PUBLIC",
      withdrawnAt: null,
    },
    create: {
      id: `seed-resume-${input.slug}`,
      slug: input.slug,
      characterId: input.characterId,
      editTokenHash: input.editTokenHash,
      visibility: "PUBLIC",
    },
  });

  const version = await prisma.resumeVersion.upsert({
    where: {
      resumeId_versionNumber: {
        resumeId: resume.id,
        versionNumber: 1,
      },
    },
    update: {
      snapshotId: input.snapshotId,
      userInput: input.userInput,
      theme: "RESUME",
      contentHash: `seed-content-${input.slug}`,
    },
    create: {
      id: `seed-version-${input.slug}`,
      resumeId: resume.id,
      snapshotId: input.snapshotId,
      userInput: input.userInput,
      theme: "RESUME",
      contentHash: `seed-content-${input.slug}`,
      versionNumber: 1,
    },
  });

  await prisma.resume.update({
    where: { id: resume.id },
    data: { currentVersionId: version.id },
  });

  await prisma.calculatedMetric.upsert({
    where: {
      resumeVersionId_key: {
        resumeVersionId: version.id,
        key: "sample-visible-metric",
      },
    },
    update: {
      snapshotId: input.snapshotId,
      value: "not-displayed",
      unit: null,
      algorithmName: "seed-example",
      algorithmVersion: "1",
      inputs: { snapshotId: input.snapshotId },
      includedFields: [],
      excludedFields: ["No production calculation is seeded"],
      disclaimer: "Seed data only. The MVP does not expose an invented score.",
    },
    create: {
      id: `seed-metric-${input.slug}`,
      snapshotId: input.snapshotId,
      resumeVersionId: version.id,
      key: "sample-visible-metric",
      value: "not-displayed",
      algorithmName: "seed-example",
      algorithmVersion: "1",
      inputs: { snapshotId: input.snapshotId },
      includedFields: [],
      excludedFields: ["No production calculation is seeded"],
      disclaimer: "Seed data only. The MVP does not expose an invented score.",
    },
  });
}

async function main(): Promise<void> {
  const now = new Date();
  const freshUntil = new Date(now.getTime() + 24 * HOUR);
  const expiresAt = new Date(now.getTime() + 30 * 24 * HOUR);
  const staleFetchedAt = new Date(now.getTime() - 26 * HOUR);
  const staleFreshUntil = new Date(staleFetchedAt.getTime() + 24 * HOUR);
  const staleExpiresAt = new Date(staleFetchedAt.getTime() + 30 * 24 * HOUR);

  const damageCharacter = await prisma.character.upsert({
    where: { ocid: "mock-ocid-lumina-star" },
    update: { name: "루미나별", worldName: "스카니아", lastSeenAt: now },
    create: {
      id: "seed-character-lumina-star",
      ocid: "mock-ocid-lumina-star",
      name: "루미나별",
      worldName: "스카니아",
      firstSeenAt: now,
      lastSeenAt: now,
    },
  });

  const damageSnapshot = await prisma.profileSnapshot.upsert({
    where: { id: "seed-snapshot-lumina-star" },
    update: {
      characterId: damageCharacter.id,
      fetchedAt: now,
      sourceDate: isoDate(now),
      freshness: "FRESH",
      freshUntil,
      expiresAt,
    },
    create: {
      id: "seed-snapshot-lumina-star",
      characterId: damageCharacter.id,
      fetchedAt: now,
      sourceDate: isoDate(now),
      provider: "MOCK",
      normalized: {
        ocid: "mock-ocid-lumina-star",
        characterName: "루미나별",
        worldName: "스카니아",
        className: "나이트로드",
        level: 289,
        imageUrl: null,
        currentGuild: "별빛원정대",
        fetchedAt: now.toISOString(),
        sourceDate: isoDate(now),
        provider: "mock",
        fields: [
          {
            key: "combat_power",
            label: "전투력",
            value: "145,000,000",
            provenance: "NEXON_API",
            category: "combat",
          },
        ],
        rawAvailability: { basic: "available", stat: "available" },
      },
      rawPayload: Prisma.JsonNull,
      rawAvailability: { basic: "available", stat: "available" },
      freshness: "FRESH",
      freshUntil,
      expiresAt,
      contentHash: "seed-snapshot-lumina-star",
    },
  });

  await prisma.guildObservation.upsert({
    where: { id: "seed-guild-lumina-star" },
    update: { lastObservedAt: now, observedTo: null, sourceSnapshotId: damageSnapshot.id },
    create: {
      id: "seed-guild-lumina-star",
      characterId: damageCharacter.id,
      guildName: "별빛원정대",
      observedFrom: now,
      lastObservedAt: now,
      sourceSnapshotId: damageSnapshot.id,
    },
  });

  await seedResume({
    characterId: damageCharacter.id,
    snapshotId: damageSnapshot.id,
    slug: "sample-lumina-star",
    editTokenHash: "seed-only-edit-token-hash-lumina-star",
    userInput: {
      targetBoss: "검은 마법사 (하드)",
      targetBossCadence: "MONTHLY",
      role: "DAMAGE",
      partyType: "FIXED",
      partySize: 6,
      availabilityMode: "SCHEDULED",
      availability: [{ days: ["토"], startTime: "20:00", endTime: "23:00", timezone: "Asia/Seoul" }],
      voiceChat: "AVAILABLE",
      lootPolicy: "파티 합의",
      experienceSummary: "하드 보스 파티 경험을 입력한 샘플입니다.",
      theme: "RESUME",
    },
  });

  const supportCharacter = await prisma.character.upsert({
    where: { ocid: "mock-ocid-solar-priest" },
    update: { name: "햇살사제", worldName: "루나", lastSeenAt: staleFetchedAt },
    create: {
      id: "seed-character-solar-priest",
      ocid: "mock-ocid-solar-priest",
      name: "햇살사제",
      worldName: "루나",
      firstSeenAt: staleFetchedAt,
      lastSeenAt: staleFetchedAt,
    },
  });

  const supportSnapshot = await prisma.profileSnapshot.upsert({
    where: { id: "seed-snapshot-solar-priest" },
    update: {
      characterId: supportCharacter.id,
      fetchedAt: staleFetchedAt,
      sourceDate: isoDate(staleFetchedAt),
      freshness: "STALE",
      freshUntil: staleFreshUntil,
      expiresAt: staleExpiresAt,
    },
    create: {
      id: "seed-snapshot-solar-priest",
      characterId: supportCharacter.id,
      fetchedAt: staleFetchedAt,
      sourceDate: isoDate(staleFetchedAt),
      provider: "MOCK",
      normalized: {
        ocid: "mock-ocid-solar-priest",
        characterName: "햇살사제",
        worldName: "루나",
        className: "비숍",
        level: 285,
        imageUrl: null,
        currentGuild: null,
        fetchedAt: staleFetchedAt.toISOString(),
        sourceDate: isoDate(staleFetchedAt),
        provider: "mock",
        fields: [
          {
            key: "combat_power",
            label: "전투력",
            value: null,
            provenance: "NEXON_API",
            category: "combat",
          },
        ],
        rawAvailability: { basic: "available", stat: "missing" },
      },
      rawPayload: Prisma.JsonNull,
      rawAvailability: { basic: "available", stat: "missing" },
      freshness: "STALE",
      freshUntil: staleFreshUntil,
      expiresAt: staleExpiresAt,
      contentHash: "seed-snapshot-solar-priest",
    },
  });

  await seedResume({
    characterId: supportCharacter.id,
    snapshotId: supportSnapshot.id,
    slug: "sample-solar-priest",
    editTokenHash: "seed-only-edit-token-hash-solar-priest",
    userInput: {
      targetBoss: "선택받은 세렌 (하드)",
      targetBossCadence: "WEEKLY",
      role: "SUPPORT",
      partyType: "PROGRESSION",
      partySize: 6,
      availabilityMode: "NEGOTIABLE",
      availability: [{ days: ["일"], startTime: "21:00", endTime: "23:30", timezone: "Asia/Seoul" }],
      voiceChat: "OPTIONAL",
      lootPolicy: "균등 분배 협의",
      experienceSummary: "일부 API 데이터가 없는 stale 샘플입니다.",
      theme: "MINIMAL",
    },
  });

  console.info("메력서 예제 데이터 2건을 준비했습니다.");
}

main()
  .catch(() => {
    console.error("시드 실행에 실패했습니다. DATABASE_URL과 마이그레이션 상태를 확인하세요.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
