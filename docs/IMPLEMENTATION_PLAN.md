# 메력부 MVP 구현 계획

## 조사 결과

- 시작 루트는 비어 있었고, 제공된 메력부 키트의 명세를 현재 저장소로 보존했다.
- NEXON API 키가 없는 환경을 기본으로 `mock` provider가 전체 흐름을 지원해야 한다.
- 로컬 개발 환경에서는 PostgreSQL/Prisma를 제공하되, 데모와 테스트는 외부 네트워크 및 별도 DB 없이도 재현 가능해야 한다.

## 구현 체크리스트

- [x] 명세, UX 카피, 아키텍처, 인수 기준, 작업 지시를 검토한다.
- [x] 현재 저장소를 초기화하고 원본 명세 파일을 보존한다.
- [x] Next.js App Router + TypeScript strict + Tailwind + pnpm 기반을 구성한다.
- [x] 도메인 모델, 출처/신선도/버전/길드 관측 규칙과 Zod 검증을 구현하고 단위 테스트를 작성한다.
- [x] mock fixture와 live NEXON adapter 경계를 구현하고 공식 API 매핑을 기록한다.
- [x] 검색 → 작성 → 실시간 미리보기 → 게시 흐름과 edit-token cookie 권한을 구현한다.
- [x] 공개 검증 페이지, stale/expired 처리, 갱신에 따른 immutable version을 구현한다.
- [x] 동일 ResumeVersion 기반의 1080×1350 PNG 및 QR 검증 링크를 구현한다.
- [x] Prisma schema, Docker Compose, seed/migration 명령 및 메모리 데모 저장소 fallback을 구성한다.
- [x] Privacy/Terms/health API, 접근성, 한국어 카피와 README를 완성한다.
- [x] unit/integration/E2E 테스트를 추가하고 모바일 375px 흐름을 검증한다.
- [x] lint, typecheck, test, test:e2e, build를 실행하고 결과를 구현 로그에 기록한다.

## 2026-07-12 — live API·장비 검증 확장

- [x] 최신 공식 문서 기준으로 `character/stat`, `character/item-equipment`, 심볼·캐시 장비·세트 효과 endpoint와 응답 매핑을 기록한다.
- [x] 전투력은 `final_stat`의 API 원값만 보존하고, 현재 장착 전투 장비 전체 및 상세 옵션을 normalized domain model로 확장한다.
- [x] 기본 정보가 정상일 때 능력치·장비 보강 호출이 부분 실패해도 작성 흐름을 유지하고, availability와 안내 문구로 드러낸다.
- [x] 편집기에 주간/월간 보스 구분과 빠른 보스 선택을 추가하고, 사용자가 사용을 허가한 Maple Trackers 원본 보스 일러스트를 서버 어댑터로 적용한다.
- [x] 공개 검증 페이지에 전투력·최종 능력치·장착 전투 장비·심볼·세트 효과·캐시 장비를 출처와 함께 분리 표시한다.
- [ ] 확장된 정규화, 보스 구분, 검색→게시→검증 흐름을 포함해 전체 품질 명령을 다시 실행하고 결과를 기록한다.

## 구현 결정

1. **기본 실행 모드**: API 키가 없으면 자동으로 mock provider를 선택한다. 실 API는 서버 route handler에서만 호출한다.
2. **데모 저장소**: Docker/PostgreSQL/Prisma 구성은 제공하되, 평가와 mock 흐름이 DB 설정 없이 실행되도록 프로세스 메모리 저장소를 기본 fallback으로 둔다. 저장소 인터페이스는 Prisma adapter로 교체 가능하게 유지한다.
3. **이미지**: 서버 route에서 SVG를 PNG로 변환하지 않고, standards-compatible `ImageResponse`로 1080×1350 이미지를 생성한다. QR은 SVG data URL로 포함한다.
4. **버전 URL**: `/r/[slug]?v=N`는 이전 immutable version을 조회할 수 있고, 현재 버전보다 오래되면 최신 버전 안내를 표시한다.

## 완료 판정

`docs/ACCEPTANCE_CRITERIA.md`의 A–I 항목과 다음 명령의 성공을 완료 조건으로 사용한다.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## 2026-07-12 최종 확장 검증

- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`(4 files, 17 tests), `pnpm test:e2e`(Chromium 2 tests), `pnpm build`를 모두 다시 실행해 통과를 확인했다.
- [x] 검색 편집기에 전투력·전체 최종 능력치·현재 장착 장비를 즉시 표시하고, mock/live provider 상태와 장비 조회 누락 사유를 함께 안내한다.
- [x] E2E는 개발용 3000번 포트를 재사용하지 않고 격리된 3100번 포트와 `.next-e2e` 빌드 디렉터리를 사용한다.
