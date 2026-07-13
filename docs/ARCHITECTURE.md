# 기술 아키텍처

## 1. 구조

```text
Browser
  ├─ Server-rendered pages / client editor
  └─ same-origin route handlers
          │
          ├─ Resume application service
          │    ├─ validation
          │    ├─ provenance assignment
          │    ├─ version/content hash
          │    └─ authorization by edit token
          │
          ├─ NEXON provider interface
          │    ├─ LiveNexonProvider
          │    └─ MockNexonProvider
          │
          ├─ Prisma repository
          └─ Image/QR renderer
                  │
             PostgreSQL
```

## 2. 권장 디렉터리

```text
src/
  app/
    (marketing)/
    create/
    r/[slug]/
    api/
  components/
    resume/
    forms/
    ui/
  content/
    ko.ts
  domain/
    character.ts
    resume.ts
    provenance.ts
    freshness.ts
    guild-observation.ts
  lib/
    nexon/
      provider.ts
      live-provider.ts
      mock-provider.ts
      schemas.ts
      normalize.ts
      errors.ts
      fixtures/
    auth/
      edit-token.ts
    image/
      render-resume.tsx
      qr.ts
    db/
      prisma.ts
      repositories/
    validation/
    observability/
  server/
    services/
      resolve-character.ts
      create-resume.ts
      refresh-resume.ts
      update-resume.ts
prisma/
  schema.prisma
  migrations/
tests/
  e2e/
```

## 3. 핵심 domain model

### NormalizedCharacterProfile

외부 응답과 UI를 분리하기 위한 안정 모델이다.

```ts
interface NormalizedCharacterProfile {
  ocid: string;
  characterName: string;
  worldName: string | null;
  className: string | null;
  level: number | null;
  imageUrl: string | null;
  currentGuild: string | null;
  fetchedAt: string;
  sourceDate: string | null;
  provider: "mock" | "live";
  fields: ProfileField[];
  stats: CharacterStat[];
  equipmentPresetNo: number | null;
  equipment: EquippedItem[];
  symbols: SymbolEquipment[];
  cashEquipment: CashEquipment[];
  setEffects: SetEffect[];
  rawAvailability: Record<string, "available" | "missing" | "unsupported">;
}

interface ProfileField {
  key: string;
  label: string;
  value: string | number | null;
  unit?: string;
  provenance: DataProvenance;
  category: "combat" | "growth" | "record" | "equipment" | "identity";
  priorityByRole?: Partial<Record<ResumeRole, number>>;
}

interface CharacterStat {
  label: string;
  value: string;
}

interface EquippedItem {
  slot: string | null;
  part: string | null;
  name: string;
  iconUrl: string | null;
  starforce: string | null;
  scrollUpgrade: string | null;
  potentialGrade: string | null;
  potentialOptions: string[];
  additionalPotentialGrade: string | null;
  additionalPotentialOptions: string[];
  totalOptions: EquipmentOption[];
  // base/add/exceptional/etc options and soul fields are retained as well.
}

interface EquipmentOption {
  label: string;
  value: string;
}
```

`stats`는 `/character/stat`의 `final_stat` 원문만 보존하며, `전투력`은 API가 실제로 보낸 값일 때만 핵심 필드로 노출한다. `equipment`는 캐시를 제외한 현재 장착 전투 장비 전체를 보존한다. 장비의 옵션·스타포스·잠재·에디셔널 잠재·소울은 검증 페이지의 상세 패널에서만 펼치고, 공유 이미지에는 전체 옵션을 렌더링하지 않는다.

### Resume draft

```ts
interface ResumeDraft {
  targetBoss: string;
  targetBossCadence?: "WEEKLY" | "MONTHLY";
  role: "DAMAGE" | "SUPPORT" | "UTILITY" | "OTHER";
  partyType: "FIXED" | "SEMI_FIXED" | "TEMPORARY" | "PROGRESSION" | "ACHIEVEMENT";
  availability: AvailabilitySlot[];
  voiceChat: "AVAILABLE" | "OPTIONAL" | "UNAVAILABLE";
  lootPolicy?: string;
  experienceSummary?: string;
  roleSummary?: string;
  contact?: { type: "DISCORD" | "OPEN_CHAT" | "COMMUNITY"; value: string };
  theme: "RESUME" | "MINIMAL";
}
```

지원 분야에는 작성 내용인 보스 구분(주간 또는 월간)과 목표 보스명이 함께 저장된다. 선택 카드의 자체 생성 일러스트는 구분을 돕는 UI 자산일 뿐, API 데이터나 특정 공식 보스 초상이 아니다.

## 4. 데이터 모델

Prisma 모델명은 상황에 맞게 조정할 수 있으나 아래 책임을 유지한다.

- `Character`: ocid, 이름, world, firstSeenAt, lastSeenAt
- `ProfileSnapshot`: characterId, fetchedAt, sourceDate, provider, normalized JSON, encrypted/limited raw JSON, freshness metadata
- `Resume`: slug, characterId, currentVersionId, visibility, editTokenHash, createdAt, updatedAt
- `ResumeVersion`: resumeId, snapshotId, user input JSON, theme, contentHash, versionNumber, publishedAt
- `CalculatedMetric`: snapshot/version, key, value, unit, algorithmName, algorithmVersion, inputs, disclaimer
- `GuildObservation`: characterId, guildName, observedFrom, lastObservedAt, observedTo, sourceSnapshotId
- `Report`: resumeId, category, detail, state

공개 이미지는 가능하면 immutable version에서 동적으로 생성한다. CDN cache key는 content hash를 포함한다.

## 5. NEXON provider interface

```ts
interface NexonProvider {
  resolveCharacter(name: string): Promise<{ ocid: string }>;
  getProfile(ocid: string, options?: { date?: string }): Promise<NormalizedCharacterProfile>;
}
```

Live provider는 여러 endpoint 결과를 병렬 조회하되, 일부 endpoint 실패가 전체 기본 프로필을 무조건 실패시키지 않도록 중요도를 구분한다.

- 핵심 live 호출: `id`, `character/basic`, `character/stat`, `character/item-equipment`
- 선택 보강 호출: `character/symbol-equipment`, `character/cashitem-equipment`, `character/set-effect`

`basic`은 프로필 생성의 기준이며, 능력치·장비·보강 endpoint가 일시적으로 실패하면 기본 프로필은 계속 작성할 수 있다. 각 실패는 `rawAvailability`와 UI notice에 남긴다. 403/invalid key, 429/rate limit, maintenance, timeout은 서로 다른 typed error로 변환한다.

## 5-1. 장비 데이터 경계

- `item-equipment`은 현재 장착 전투 장비 전체와 API 제공 옵션을 저장한다.
- `symbol-equipment`은 심볼을, `set-effect`는 적용 세트 효과를 보강한다.
- `cashitem-equipment`은 꾸미기 장비로 별도 모델에 저장해 전투 장비로 오인하지 않게 한다.
- API가 반환하지 않은 슬롯·옵션·전투력은 추측하거나 `0`으로 채우지 않는다.
- 장비와 전투력으로 서비스 자체 점수, 합격 판정, 환산 수치를 만들지 않는다.

## 6. 캐시와 신선도

- same character + source date 기준 cache
- 요청 폭주를 막는 single-flight/deduplication
- 개발은 DB cache로 충분; production 확장 시 Redis adapter 가능
- 기본 fresh TTL: 24시간
- public expiry: 30일
- refresh는 새 snapshot과 새 ResumeVersion 생성
- 오래된 version URL은 계속 식별되지만 API 파생 데이터 노출 정책은 약관에 맞게 제한

## 7. 이미지 생성

- 1080×1350 PNG
- 서버에서 동일 version 데이터를 렌더링
- 외부 이미지 fetch 실패 시 initials/placeholder
- QR은 canonical verification URL을 가리킨다.
- 한국어 폰트는 라이선스가 명확한 패키지/자체 호스팅 방식만 사용한다.
- 이미지 route는 content hash 기반 immutable cache header를 사용할 수 있다.
- 이미지에 API key, edit token, 비공개 contact를 포함하지 않는다.

## 7-1. 글 양식 복사

- 서버 컴포넌트가 현재 `PublicResumeView`와 canonical URL에서 고정 순서의 plain text를 만든다.
- 클라이언트 복사 버튼에는 완료된 문자열만 전달해, 장비 상세·비공개 연락처·edit token을 hydrate하지 않는다.
- Clipboard API가 거부되면 사용자 동작 안에서 textarea 선택/복사 fallback을 사용하고, 성공·실패는 `aria-live` 상태로 알린다.

## 8. 편집 권한

1. 게시 시 256-bit 이상 random edit token 생성
2. DB에는 strong hash만 저장
3. 원문 token은 HttpOnly, Secure(production), SameSite=Lax cookie
4. update/delete/refresh에서 constant-time 검증
5. 공개 페이지는 수정 기능을 노출하지 않거나 cookie 보유자에게만 표시

## 9. 관측 가능한 운영

- 구조화 로그: request id, operation, provider, duration, status
- 금지 로그: API key, edit token, raw contact, 전체 raw response
- health route는 DB 연결과 provider mode를 표시하되 secret은 노출하지 않는다.
- Sentry 등 외부 도구는 optional adapter로 두고 필수 계정 없이 동작한다.

## 10. 배포

- Node.js runtime이 필요한 이미지/DB 기능은 edge로 강제하지 않는다.
- Dockerfile 또는 표준 Node 배포 가능 구성
- PostgreSQL migration 명령 제공
- `.env.example` 완성
- README에 local mock mode, live API mode, production checklist를 분리
