# 메력서 (Resumae)

메력서는 메이플스토리 캐릭터 API 조회값과 작성자가 제공한 파티 조건을 분리해 보여 주는, 검증 가능한 파티 구직용 **메력서** 생성 서비스입니다. 공유 카드와 검증 페이지에는 데이터 기준 시각, 출처, 버전, QR 검증 URL 및 `Data based on NEXON Open API` 고지를 표시합니다. 이 서비스는 NEXON의 공식 제휴·인증 서비스가 아닙니다.

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

## 메붕이 온도

메력서 작성자는 `메붕이 온도 설문 링크 만들기`로 7일 안에 한 번 사용할 수 있는 링크를 발급할 수 있습니다. 실제 함께한 파티원은 닉네임, 메력서 주소, 연락처를 입력하지 않고 세 문항에 답합니다.

- 보스 경험과 숙련도는 각각 `매우 불만족(-2℃)`부터 `매우 만족(+2℃)`까지, 시간 약속은 `아니다(-1℃)` 또는 `그렇다(+1℃)`로 응답합니다.
- 기본값은 36.5℃이며, 응답 한 건의 합계(-5~+5℃)를 같은 캐릭터 OCID에 누적합니다. 새 메력서와 새 version에도 유지되고 0.0~100.0℃ 범위로 제한됩니다.
- 링크 원문은 URL의 `#invite` fragment로만 전달되고 DB에는 hash만 저장됩니다. 설문자 메력서, 닉네임, 연락처, reviewer OCID는 저장하지 않습니다.
- 공개 검증 페이지에는 온도·게이지·응답 수만 표시합니다. 개별 답변, 설문자 신원, 자유 댓글, 순위는 표시하지 않습니다.
- 메붕이 온도는 이력서 미리보기와 1080×1350 PNG의 핵심 항목으로 표시됩니다. 설문이 반영된 뒤에는 같은 이미지 URL도 최신 익명 집계값으로 다시 렌더링됩니다. 자동 매칭·합격 판단에는 사용하지 않습니다.

## 나의 이력서: 여러 보스를 묶은 저장 목록

한 메력서에는 주간·월간 보스를 최대 6개까지 묶고, 보스마다 작성자가 확인한 배율을 함께 기록할 수 있습니다. 상단의 `나의 이력서`에서는 같은 브라우저로 만든 메력서를 보스 묶음별로 다시 열 수 있으며, 각 카드에서 공개 보기, 수정, `새 메력서로 저장`을 선택할 수 있습니다. 따라서 같은 캐릭터의 공략 묶음·일자별 기록을 기존 URL과 별도로 보관할 수 있습니다.

이 기능은 로그인 대신 각 메력서를 만들 때 발급한 HttpOnly 편집 권한 cookie를 사용합니다. 따라서 다른 기기·브라우저·시크릿 창으로 열거나 cookie를 지운 경우 목록은 비어 보입니다. `localhost`에서 만든 기록과 배포 도메인에서 만든 기록도 서로 다른 저장소와 cookie를 사용합니다.

## 사이트 안에서 파티 구인 · 구직하기

상단 `파티 게시판`에서 현재 공개 중이고 최신 상태인 메력서를 바탕으로 파티원을 모집하거나 참여할 파티를 찾을 수 있습니다.

- 게시글은 선택한 메력서의 보스 묶음과 보스별 배율을 그대로 고정해 7일 동안 표시합니다. 메력서를 수정·갱신하거나 비공개로 전환하면 기존 게시글은 공개 목록에서 자동으로 숨겨집니다.
- 다른 사용자는 같은 보스가 하나 이상 포함된 본인의 공개·최신 메력서로만 지원할 수 있습니다. 본인 게시글과 동일 캐릭터의 중복 지원은 서버에서 막습니다.
- 작성자는 지원자의 공개 프로필 요약과 선택 메시지만 보고 수락·거절하거나 게시글을 마감할 수 있습니다. 연락처, 편집 권한, OCID, 개별 메붕이 온도 설문 답변은 게시판에 포함되지 않습니다.
- 메붕이 온도는 게시글 노출, 정렬, 지원 가능 여부, 수락 판단에 사용하지 않습니다.

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

| 변수                         | 용도                                                      |
| ---------------------------- | --------------------------------------------------------- |
| `NEXON_PROVIDER`             | `mock` 또는 `live` provider 선택                          |
| `NEXON_OPEN_API_KEY`         | live 모드에서만 필요한 서버 전용 NEXON API key            |
| `NEXON_BASE_URL`             | live API base URL                                         |
| `DATABASE_URL`               | PostgreSQL 연결 문자열                                    |
| `MEYUKBU_STORAGE`            | `memory`(mock demo) 또는 `prisma`(PostgreSQL 영속 저장소) |
| `APP_ORIGIN`                 | QR/공유 이미지에 넣을 canonical public origin             |
| `PROFILE_FRESH_HOURS`        | fresh 판정 시간(기본 24시간)                              |
| `PROFILE_PUBLIC_EXPIRY_DAYS` | 공개 API 데이터 만료 시간(기본 30일)                      |
| `APP_SECRET`                 | production에서 token/content hash 보조에 쓰는 긴 비밀값   |

## 저장소 동작 원칙

- 테스트와 DB 없는 mock 데모는 프로세스 메모리 저장소를 쓴다. 재시작하면 게시물이 사라진다.
- 로컬 DB와 production은 Prisma + PostgreSQL을 사용한다.
- production은 DB가 없을 때 메모리 fallback으로 공개 데이터를 만들지 않는다. 자세한 근거는 [DECISIONS.md](docs/DECISIONS.md)를 참고하세요.
- NEXON API 데이터는 24시간 후 stale, 30일 후 expired로 표시하며, expired snapshot의 API 파생 값은 갱신 전까지 공개하지 않는다.
- 전투력은 API 종합 능력치의 원값만 사용하며, 장비 기반 점수·환산·합격 판정을 만들지 않는다.
- 보스 지원은 주간/월간 구분과 목록에서 선택한 보스명으로 정한다. 난이도는 보스명에 포함되므로 별도 입력하지 않는다. 사용자가 사용을 허가한 Maple Trackers 보스 원본은 선택한 보스 키와 1:1로 연결된 정적 자산으로 표시한다.

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
