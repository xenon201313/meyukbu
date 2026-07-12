# 구현 및 검증 로그

## 2026-07-12 — MVP 완성

### 구현 범위

- Next.js App Router / TypeScript strict / Tailwind / pnpm 프로젝트를 빈 루트에 구성했다.
- mock 및 server-only live NEXON provider, Zod 응답·입력 검증, 오류 매핑, cache/deduplication과 retry를 구현했다.
- 캐릭터 검색 → 편집 → 실시간 메력서 미리보기 → 게시 → edit-token cookie 권한 → 공개 검증 페이지 → 갱신/새 version → 공개 중단을 구현했다.
- 1080×1350 `ImageResponse` PNG, OFL Noto Sans KR 폰트, QR canonical URL, private contact 제외를 구현했다.
- fresh/stale/expired, immutable content hash/version, 길드 관측 transition과 출처 범례를 구현했다.
- PostgreSQL Prisma schema, 초기 migration, seed, Docker Compose, memory/prisma repository adapter를 추가했다.
- privacy/terms/health route, 한국어 카피, README, NEXON API mapping 및 결정 기록을 완성했다.

### 실행 결과

| 명령 | 결과 |
| --- | --- |
| Final expanded verification (2026-07-12) | PASS — `pnpm lint`, `pnpm typecheck`, `pnpm test` (4 files, 17 tests), `pnpm test:e2e` (Chromium 2 tests), and `pnpm build` |
| Live profile display follow-up (2026-07-12) | PASS — immediate combat/equipment panel, safe provider diagnostics, and isolated E2E server; `pnpm test` (6 files, 22 tests) and Chromium E2E 2 tests |
| `pnpm db:generate` | 통과 — Prisma Client 생성 |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 통과 — 4 files, 14 tests |
| `pnpm test:e2e` | 통과 — Chromium 2 tests (검색·게시·검증·PNG·갱신 / 375px 모바일) |
| `pnpm build` | 통과 — production build |

### 확인하지 못한 외부 의존성

- 이 환경에는 Docker CLI와 PostgreSQL 실행 인스턴스가 없어 `pnpm db:migrate` 및 `pnpm db:seed`의 실제 DB 연결 실행은 하지 못했다. `prisma/schema.prisma`, 초기 migration, `docker-compose.yml`, `prisma/seed.ts`, `pnpm db:generate`는 준비·검증했다.
- NEXON API key가 제공되지 않아 live endpoint의 실제 계정 호출은 하지 않았다. 공식 문서 기반 endpoint/schema/error mapping은 `docs/NEXON_API_MAP.md`에 기록했고, mock provider로 전체 흐름을 E2E 검증했다.

## 2026-07-12 — live API·장비 검증 확장

### 구현 범위

- live provider의 표준 조회 범위를 `id`/`character/basic`에서 `character/stat`, `character/item-equipment`까지 넓혔다. 기본 정보 이후 능력치·장비 호출은 병렬 보강이며, 각 실패가 전체 작성 흐름을 막지 않는다.
- 전투력은 `character/stat.final_stat`의 API 원값만 보존한다. 현재 장착 전투 장비는 슬롯, 아이템명, 옵션, 스타포스, 잠재능력, 에디셔널 잠재능력, 소울까지 snapshot에 보존한다.
- 심볼, 캐시 장비, 세트 효과는 선택 보강 endpoint로 추가했다. 캐시 장비는 전투 장비와 분리해 표시한다.
- 편집기에 주간/월간 보스 구분과 보스 빠른 선택을 추가했다. 사용자가 `maple-trackers.com` 운영자로서 사용을 허가한 보스 원본은 `/api/boss-art/[key]`가 서버에서 읽어 표시하며, 저장소에는 이미지 파일을 복제하지 않는다. 외부 source가 없는 offline E2E에서는 중립 fallback만 사용한다.
- 공개 검증 페이지에는 전투력·최종 능력치·현재 장착 전투 장비의 접기식 상세와 심볼·세트 효과·캐시 장비 섹션을 추가했다. 공유 PNG는 기존대로 핵심 요약만 표시한다.

### 확장 단위 검증

| 명령 | 결과 |
| --- | --- |
| `tsc --noEmit` | 통과 — 확장된 profile 및 보스 구분 타입 검증 |
| `vitest run` | 통과 — 4 files, 17 tests; 전투력 원값·장비 정규화·부분 응답·보스 구분 검증 포함 |

전체 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build` 결과는 확장 코드 통합 후의 최종 검증 항목으로 유지한다.
