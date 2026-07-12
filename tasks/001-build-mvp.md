# Task 001 — 메력부 MVP 전체 구현

## 목표

현재 저장소를 조사하고 `AGENTS.md`, `docs/*`, `spec/project.yaml`을 기준으로 메력부의 production-quality MVP를 구현한다.

## 실행 순서

1. 저장소 상태와 기존 파일을 조사한다.
2. `docs/IMPLEMENTATION_PLAN.md`에 단계별 계획과 체크박스를 작성한다.
3. 저장소가 비어 있으면 최신 안정 Next.js App Router + TypeScript strict + pnpm 프로젝트를 현재 root에 scaffold한다. 기존 명세 파일은 보존한다.
4. mock provider부터 vertical slice를 완성한다.
5. Prisma/PostgreSQL, edit token, public version을 구현한다.
6. live NEXON provider를 공식 문서 기준으로 구현하고 `docs/NEXON_API_MAP.md`를 작성한다.
7. 공개 페이지와 1080×1350 이미지/QR을 구현한다.
8. fresh/stale/expired, 갱신/version, 길드 관측을 구현한다.
9. unit/integration/E2E 테스트와 접근성을 완성한다.
10. 모든 품질 명령을 실행하고 실패를 해결한다.
11. README와 `docs/IMPLEMENTATION_LOG.md`를 완성한다.

## 필수 행동

- 비밀키가 없어도 mock mode로 전체 흐름을 실행 가능하게 만든다.
- 단순 TODO, placeholder button, 정적 mock page를 완료로 간주하지 않는다.
- 공식 API response field는 현재 NEXON 문서 또는 fixture로 확인한 것만 사용한다.
- 일부 endpoint가 불확실하면 required 기본 조회를 완성하고 optional section은 안전하게 degrade한다.
- 사용자에게 중간 확인을 요구하지 말고 합리적인 기본값으로 진행한다. 정말로 외부 자격증명이 있어야만 가능한 마지막 검증만 명확히 남긴다.

## Definition of Done

`docs/ACCEPTANCE_CRITERIA.md`의 모든 체크박스를 충족하고 아래 명령이 통과한다.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```
