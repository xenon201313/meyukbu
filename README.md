# 메력부 (Meyukbu)

메력부는 메이플스토리 캐릭터 API 조회값과 사용자가 직접 입력한 파티 조건을 분리해 보여 주는, 검증 가능한 파티 구직용 **메력서** 생성 서비스입니다. 공유 카드와 검증 페이지에는 데이터 기준 시각, 출처, 버전, QR 검증 URL 및 `Data based on NEXON Open API` 고지를 표시합니다. 이 서비스는 NEXON의 공식 제휴·인증 서비스가 아닙니다.

## 빠른 시작: API 키 없는 mock 모드

mock 모드는 외부 네트워크와 PostgreSQL 없이 전체 사용자 흐름을 실행하는 기본 모드입니다.

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

`.env.local`의 기본값 `NEXON_PROVIDER=mock`을 유지하세요. 두 개의 현실적인 한국어 샘플 캐릭터와 fresh/stale/일부 누락 데이터를 사용하며, 화면에서 mock 데이터임을 명확히 표시합니다.

## 로컬 PostgreSQL + Prisma

PostgreSQL을 사용하면 게시물·버전·snapshot·길드 관측을 재시작 후에도 유지하며 확인할 수 있습니다. `.env.local`의 `DATABASE_URL` 기본값은 아래 Compose 구성을 가리킵니다.

```powershell
docker compose up -d postgres
 # Set MEYUKBU_STORAGE=prisma in .env.local before starting the app.
pnpm prisma migrate dev --name init
pnpm prisma generate
pnpm prisma db seed
pnpm dev
```

`prisma/seed.ts`는 damage/support 역할의 예제 캐릭터와 메력서를 idempotent하게 준비합니다. 개발 migration을 새로 만들 때는 `pnpm prisma migrate dev --name <migration-name>`을 사용합니다. 이미 적용된 migration만 운영 환경에 반영할 때는 다음을 사용합니다.

```powershell
pnpm prisma migrate deploy
pnpm prisma generate
```

Compose를 멈추려면 `docker compose down`을 사용합니다. `docker compose down -v`는 로컬 DB 볼륨을 삭제하므로 데이터 삭제가 의도된 경우에만 사용하세요.

## live NEXON Open API 모드

1. [NEXON Open API](https://openapi.nexon.com/ko/game/maplestory/)에서 서버용 API key를 발급합니다.
2. `.env.local`에서 아래처럼 설정합니다.

```dotenv
NEXON_PROVIDER=live
NEXON_OPEN_API_KEY=your-server-only-key
NEXON_BASE_URL=https://open.api.nexon.com/maplestory/v1
```

설정 뒤 개발 서버를 다시 시작하고 `/api/health`에서 provider mode가 `live`인지 확인한 후 실제 캐릭터명을 검색하세요. `NEXON_OPEN_API_KEY`를 `NEXT_PUBLIC_` 변수, 소스 코드, 브라우저 개발자 도구, 캡처 이미지에 넣지 않습니다. 키는 브라우저 코드, HTML, 오류 응답, 로그에 절대 포함하지 않으며, live provider는 서버 route handler에서만 `x-nxopen-api-key` 헤더를 전송합니다.

live provider는 캐릭터 식별자와 기본 정보에 더해 아래를 조회합니다.

- `character/stat`: `final_stat`의 API 원문과 전투력(응답에 있을 때만)
- `character/item-equipment`: 현재 장착 전투 장비 전체, 옵션, 스타포스, 잠재능력, 에디셔널 잠재능력, 소울
- 선택 보강: `character/symbol-equipment`, `character/cashitem-equipment`, `character/set-effect`

장비 전체 옵션은 공개 검증 페이지에서 확인하며, 공유 PNG에는 가독성을 위해 핵심 지표만 넣습니다. 일부 보강 endpoint가 실패해도 기본 프로필로 계속 작성할 수 있고, 누락 값을 임의로 채우지 않습니다. 키가 없거나 `NEXON_PROVIDER=mock`이면 자동으로 mock provider를 사용합니다. 정확한 endpoint, schema, 오류 코드는 [NEXON_API_MAP.md](docs/NEXON_API_MAP.md)를 참고하세요.

## 환경 변수

모든 변수의 설명과 안전한 개발 기본값은 [.env.example](.env.example)에 있습니다.

| 변수                         | 용도                                                       |
| ---------------------------- | ---------------------------------------------------------- |
| `NEXON_PROVIDER`             | `mock` 또는 `live` provider 선택                           |
| `NEXON_OPEN_API_KEY`         | live 모드에서만 필요한 서버 전용 NEXON API key             |
| `NEXON_BASE_URL`             | live API base URL                                          |
| `DATABASE_URL`               | PostgreSQL 연결 문자열                                     |
| `MEYUKBU_STORAGE`            | `memory`(mock demo) 또는 `prisma`(PostgreSQL 영속 저장소)  |
| `APP_ORIGIN`                 | QR/공유 이미지에 넣을 canonical public origin              |
| `MEYUKBU_EXTERNAL_ART`       | `false`이면 Maple Trackers 보스 아트 대신 offline fallback |
| `PROFILE_FRESH_HOURS`        | fresh 판정 시간(기본 24시간)                               |
| `PROFILE_PUBLIC_EXPIRY_DAYS` | 공개 API 데이터 만료 시간(기본 30일)                       |
| `APP_SECRET`                 | production에서 token/content hash 보조에 쓰는 긴 비밀값    |

## 저장소 동작 원칙

- 테스트와 DB 없는 mock 데모는 프로세스 메모리 저장소를 쓴다. 재시작하면 게시물이 사라진다.
- 로컬 DB와 production은 Prisma + PostgreSQL을 사용한다.
- production은 DB가 없을 때 메모리 fallback으로 공개 데이터를 만들지 않는다. 자세한 근거는 [DECISIONS.md](docs/DECISIONS.md)를 참고하세요.
- NEXON API 데이터는 24시간 후 stale, 30일 후 expired로 표시하며, expired snapshot의 API 파생 값은 갱신 전까지 공개하지 않는다.
- 전투력은 API 종합 능력치의 원값만 사용하며, 장비 기반 점수·환산·합격 판정을 만들지 않는다.
- 보스 지원은 주간/월간 구분을 먼저 고른 뒤 보스명과 난이도를 입력한다. 사용자가 사용을 허가한 Maple Trackers 보스 원본은 서버 어댑터로만 표시하며, 이미지를 저장소에 복제하지 않는다. `MEYUKBU_EXTERNAL_ART=false`에서는 offline fallback을 쓴다.

## 품질 검사

변경 후 다음 명령이 모두 성공해야 합니다.

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## 배포 전 확인

- PostgreSQL과 `DATABASE_URL`을 준비하고 `pnpm prisma migrate deploy`를 실행한다.
- `APP_ORIGIN`을 실제 HTTPS origin으로 설정한다.
- 충분히 긴 고유 `APP_SECRET`과 live API key를 배포 secret store에만 저장한다.
- `/api/health`에서 provider mode와 DB 상태를 확인하되 비밀값을 노출하지 않는다.
- 30일 이내 API 데이터 갱신, stale/expired 안내, NEXON 데이터 출처 및 비제휴 고지를 확인한다.
