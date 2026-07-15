# 구현 및 검증 로그

## 2026-07-15 — 다중 보스 메력서·사이트 내 파티 게시판·메붕이 온도

### 구현 범위

- 한 메력서에 1~6개 보스와 각 보스의 작성 배율을 저장하는 `bossTargets`를 추가했다. 기존 단일 보스 버전은 첫 target으로 읽어 과거 공개 링크와 PNG가 깨지지 않게 유지했으며, 중복 보스와 스우 2인·최초의 대적자/림보/발드릭스/찬란한 흉성/유피테르 3인 제한은 편집기와 서버에서 함께 검증한다.
- 편집기·문서형 미리보기·공개 검증 페이지·1080×1350 PNG·공유용 글·나의 이력서 목록이 같은 보스 묶음과 개별 배율을 표시한다. PNG renderer URL은 `layout=7`로 올렸고, 최대 6개 보스여도 QR과 데이터 출처 푸터가 남도록 테스트했다.
- `/parties`에서 최신·공개·신선한 메력서에 고정된 모집/파티 찾기 글을 탐색하고, `/parties/new`에서 본인 이력서로 모집 글을 만들며, `/parties/[slug]`에서 같은 보스가 하나 이상 겹치는 본인 메력서로 지원할 수 있게 했다. 작성자는 지원자의 공개 요약과 선택 메시지만 보고 수락·거절·마감할 수 있다.
- `PartyPost`·`PartyApplication` Prisma migration과 메모리 저장소를 추가했다. 7일 만료, stale/expired/비공개/갱신된 pinned version의 공개 목록 제외, 중복 지원 및 동시 결정 방지, same-origin·Zod·rate limit·HttpOnly edit-token 검증을 적용했다. 이력서를 수정해 공개 목록에서 숨겨진 게시글도 작성자는 지원 현황을 관리하고 마감할 수 있다.
- 사용자 노출 이름은 모두 `메붕이 온도`로 바꿨다. 기존 내부 경로·DB 식별자는 기존 초대 링크와 누적 설문 데이터를 보존하기 위해 그대로 두며, 온도는 파티 추천·정렬·수락 판단에 사용하지 않는다.

### 검증 결과

| 명령 | 결과 |
| --- | --- |
| `pnpm db:generate` | 통과 |
| `pnpm format:check` | 통과 |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 24 files, 91 tests 통과 |
| `pnpm test:e2e` | Chromium 9 tests 통과 — 6보스 PNG/QR, 수정 재진입, 게시·지원·수락·마감, 375px 접근성 포함 |
| `pnpm build` | 통과 — 파티 게시판 API/페이지 포함 production route 생성 확인 |

### 배포 전제

- PostgreSQL을 쓰는 배포 환경은 새 migration `20260715090000_add_party_board`를 적용해야 한다. 기존 `vercel-build`는 `prisma migrate deploy`를 먼저 실행하므로, `DATABASE_URL`과 `DATABASE_URL_UNPOOLED` 설정을 유지하면 된다.

## 2026-07-14 — 메붕이 온도를 이력서·공유 PNG에 포함

### 구현 범위

- 메붕이 온도를 공개 검증 페이지의 보조 패널에만 두지 않고, 작성 중인 문서형 이력서 미리보기와 실제 1080×1350 공유 PNG의 핵심 항목으로 표시했다. 두 화면 모두 현재 온도, 0~100℃ 게이지, 익명 설문 응답 수만 보여 주며, 응답자·개별 답변·문항별 점수는 공개하지 않는다.
- 새 이력서는 36.5℃와 `익명 설문 응답 대기 중`으로 시작한다. 기존 이력서를 수정하거나 복제할 때는 캐릭터 OCID에 누적된 최신 익명 집계를 불러온다.
- ResumeVersion의 스냅샷·content hash·QR 검증 URL은 기존처럼 고정한다. 다만 캐릭터 단위의 동적 체온 집계는 이미지 요청 시 서버에서 다시 읽고, `/r/[slug]/image`는 `no-store`로 응답해 설문 뒤 오래된 PNG가 남지 않도록 했다. 이미지 renderer URL은 `layout=6`으로 분리했다.
- 이력서 글 복사와 PNG의 대체 텍스트에도 동일한 현재 집계 요약을 포함해, 이미지·문서·텍스트 공유가 서로 다른 정보를 전달하지 않게 했다.

### 검증 결과

| 명령 | 결과 |
| --- | --- |
| `pnpm db:generate` | 통과 |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 20 files, 71 tests 통과 |
| `pnpm test:e2e` | Chromium 6 tests 통과 — 기본/누적 체온, 같은 PNG URL의 최신 바이트 재렌더, `no-store`, 375px 설문 흐름 검증 |
| `pnpm build` | 통과 |
| `pnpm format:check` | 통과 |
| `git diff --check` | 통과 |

## 2026-07-14 — 익명 메붕이 온도 설문

### 구현 범위

- 사용자 명시 승인에 따라 기존 기명 태그 UI를 `메붕이 온도` 익명 3문항 설문으로 교체했다. 보스 경험과 숙련도는 각각 -2~+2, 시간 약속은 -1/+1이며, 기본값은 36.5℃다.
- 작성자 edit token으로만 7일 만료·1회용 설문 링크를 발급한다. 원문 token은 URL `#invite` fragment로만 전달하고, DB에는 hash만 저장한다.
- `TemperatureSurveyInvitation`과 `TemperatureSurveyResponse`를 Character OCID에 연결했다. 응답에는 닉네임, 메력서 slug, reviewer OCID, 연락처, 자유 댓글을 저장하지 않는다. 점수는 익명 집계에만 사용한다.
- 공개 검증 페이지에는 현재 온도, 게이지, 익명 응답 수만 표시한다. 공유 PNG, QR 공유 이미지, 이력서 글 복사에는 동적 온도를 포함하지 않아 immutable ResumeVersion과 content hash를 유지한다.
- 같은 캐릭터로 새 메력서를 만들면 온도가 이어지며, 다른 캐릭터의 링크 제출·만료 링크·재사용 링크는 차단한다. Next route bundle 간 error prototype 차이로 재사용 링크가 500이 되던 문제는 안정적인 error code 판별로 409 처리하도록 수정했다.
- 기존 기명 태그 데이터에는 점수 대응 관계가 없으므로 임의 변환하지 않고 보존했다. 새 익명 설문이 없는 캐릭터는 36.5℃로 시작한다.

### 검증 결과

| 명령 | 결과 |
| --- | --- |
| `pnpm db:generate` | 통과 |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 20 files, 69 tests 통과 |
| `pnpm test:e2e` | Chromium 6 tests 통과 — 익명 입력 제거, 3문항 값, 36.5℃, 1회용 409, 새 메력서 지속, PNG 분리, 375px 설문 흐름을 검증 |
| `pnpm build` | 통과 |
| `pnpm format:check` | 통과 |
| `git diff --check` | 통과 |

### 배포 전제

- 새 Prisma migration `20260714110000_add_anonymous_temperature_surveys`를 포함했다. 배포 환경에서는 기존 `vercel-build` 명령이 `prisma migrate deploy`를 먼저 실행하므로, DATABASE_URL_UNPOOLED 설정이 유지되어야 한다.

## 2026-07-14 — 메붕이 온도 기명 동행 기록 (D-005로 대체됨)

### 구현 범위

> 이 항목은 초기 구현 기록입니다. 이후 사용자 승인에 따라 D-005의 익명 3문항 누적 설문·게이지 방식으로 대체되었으며, 현재 공개 화면과 PNG에는 기명 태그를 표시하지 않습니다.

- `메붕이 온도`를 숫자·별점·순위가 없는 긍정 태그형 동행 기록으로 구현했다. 허용 태그는 약속 시간 준수, 공략 준비, 원활한 소통, 재도전 적극성, 공정한 분배이며 1~3개만 제출할 수 있다.
- 작성자만 HttpOnly edit token으로 7일 만료·1회 사용 확인 링크를 발급한다. 원문 token은 URL fragment의 `#invite`로만 전달하고 DB에는 해시만 보관한다.
- 평가자는 본인이 관리하는 공개 메력서와 해당 브라우저의 edit token을 사용한다. 자기 평가, 동일 OCID의 대상 메력서 중복 기록, 만료·재사용 링크, 다른 version에 발급한 링크는 차단한다.
- `TemperatureInvitation`·`TemperatureFeedback` Prisma migration과 memory/Prisma 저장소를 추가했다. `(resumeVersionId, resumeId)` 복합 foreign key로 이력서와 다른 version을 연결할 수 없게 했다.
- 공개 검증 페이지는 해당 immutable version의 기명 태그와 평가자 공개 메력서 링크만 보여 준다. 평가자 메력서가 공개 중단되면 해당 기록은 숨긴다.
- 공유 PNG, QR 이미지, 이력서 글 복사에는 동행 기록을 넣지 않아 기존 content hash와 이미지 version을 유지한다.

### 검증 결과

| 명령 | 결과 |
| --- | --- |
| `pnpm format:check` | 통과 |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 17 files, 61 tests 통과 |
| `pnpm test:e2e` | Chromium 3 tests 통과 — 작성자/평가자 분리 세션, 초대 링크, 기명 태그, PNG 불변, 375px 흐름 포함 |
| `pnpm build` | 통과 |

| `git diff --check` | 통과 |

### 남은 환경 확인

- 로컬 Docker가 없어 PostgreSQL migration의 실제 적용은 실행하지 못했다. 배포 환경에서는 `pnpm prisma migrate deploy`를 실행해야 하며, 기존 Vercel `vercel-build` 명령은 이를 수행한다.

## 2026-07-14 — 나의 이력서 보스별 관리

### 구현 범위

- `/my-resumes` 탭을 추가해 현재 브라우저에서 편집 권한을 가진 메력서를 보스명 기준으로 정렬하고, 보스별 필터·캐릭터별 묶음으로 열람할 수 있게 했다.
- 각 카드에 공개 보기, 수정, 기존 내용을 유지한 새 메력서로 저장 동작을 연결했다. 공개 중단된 항목은 잘못된 편집 링크 대신 상태만 표시한다.
- `GET /api/my-resumes`는 `meyukbu_edit_{slug}` HttpOnly cookie를 최대 40개만 후보로 읽은 뒤, 각 token hash를 검증한 항목만 최소 요약으로 반환한다. 연락처, token 원문, hash, 전체 version 이력은 반환하지 않는다.
- 응답에 `Cache-Control: private, no-store`와 `Vary: Cookie`를 적용했고, 다른 브라우저·기기·시크릿 창·삭제된 cookie에서는 빈 상태가 보인다는 안내를 제공한다.
- 단위 테스트는 잘못된 token, 누락 cookie, 여러 보스 기록의 정렬·최소 응답 경계를 확인한다. E2E는 같은 브라우저의 두 기록, 다른 브라우저 기록의 비노출, 보스 탭 필터, 열기·수정·복제 링크와 375px 가로 넘침을 검증한다.

### 최종 검증

| 명령 | 결과 |
| --- | --- |
| `pnpm format:check` | 통과 |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 통과 — 18 files, 63 tests |
| `pnpm test:e2e` | 통과 — Chromium 5 tests (375px 목록 흐름 포함) |
| `pnpm build` | 통과 — `/my-resumes`, `/api/my-resumes` route 생성 확인 |

## 2026-07-13 — 보스별 별도 저장·희망 인원·참여 시간 방식

- 공개 메력서의 작성자 관리 영역에 `새 메력서로 저장`을 추가했다. 이 흐름은 기존 메력서의 edit token을 확인한 뒤 같은 캐릭터·작성 내용을 새 slug와 version 1로 생성하므로, 보스별·일자별 기록이 원본 공개 URL이나 기존 version을 덮어쓰지 않는다.
- 작성 내용에 `희망 인원`(1~6인격)을 추가했다. 선택 가능한 인원과 서버 검증은 같은 보스 카탈로그를 사용하며, 스우는 최대 2인격, 최초의 대적자·림보·발드릭스·찬란한 흉성·유피테르는 최대 3인격으로 제한한다. 그 외 카탈로그 보스는 최대 6인격이다.
- 가능한 시간에는 `요일·시간 지정`, `요일·시간 협의 가능`, `요일·시간 무관`을 제공한다. 선택값은 편집 미리보기, 공개 검증 PNG, 이력서 글 복사에 같은 문구로 출력된다. PNG renderer 버전은 `5`로 올려 기존 캐시와 새 레이아웃을 분리했다.
- 단위 테스트는 제한 보스·시간 방식·저장 JSON 호환성·같은 캐릭터의 별도 slug 생성을 검증하고, E2E는 복제 저장 후 원본 version이 그대로 유지되는 흐름과 375px 모바일 시간 방식 전환을 검증한다.

### 최종 검증

| 명령 | 결과 |
| --- | --- |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 16 files, 57 tests 통과 |
| `pnpm test:e2e` | 2 tests 통과 |
| `pnpm build` | 통과 |
| `pnpm format:check` | 통과 |

## 2026-07-13 — 문서형 메력서와 글 양식 복사

- 1080×1350 정본 PNG를 카드 묶음 대신 한 장의 이력서 용지처럼 재구성했다. 제목, 캐릭터 정보, 지원 분야, 환산·보스 배율, 파티 조건, QR 검증 정보를 고정된 표와 구분선 순서로 배치해 입력 길이가 달라도 레이아웃이 흐트러지지 않게 했다.
- 공개 검증 페이지는 정본 PNG 자체를 표시하고 같은 URL로 다운로드하므로, 화면에서 본 이력서와 저장되는 PNG가 같은 이미지 버전을 사용한다. 이미지 renderer 버전을 `4`로 올려 CDN 캐시도 분리했다.
- 편집 미리보기도 같은 문서형 순서로 바꾸고, 보이스 채팅 표기는 사용자에게 `디스코드`로 표시했다.
- 공개 메력서에 `이력서 글 복사` 버튼을 추가했다. 캐릭터 정보, 지원 분야, 환산·보스 배율, 파티 조건, 검증 URL을 일정한 plain-text 양식으로 복사하며, 비공개 연락처·edit token·API key는 포함하지 않는다.

### 검증 결과

| 명령 | 결과 |
| --- | --- |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 통과 — 16 files, 49 tests |
| `pnpm test:e2e` | 통과 — Chromium 2 tests, 문서형 PNG 생성·복사 버튼·모바일 흐름 확인 |
| `pnpm build` | 통과 |
| `pnpm format:check` | 통과 |

## 2026-07-13 — 파티 유형 `업적` 추가

- `ACHIEVEMENT`를 파티 유형의 정식 도메인 값으로 추가했다. Zod 입력 검증과 저장 JSON 파서는 같은 enum을 사용하므로 새 값이 안전하게 게시 버전에 저장된다.
- 작성 화면의 파티 유형 선택지에 `업적`을 넣었고, 편집 미리보기와 1080×1350 발급 PNG는 공통 라벨 맵을 통해 동일하게 `업적`으로 표시한다.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`(14 files, 43 tests), `pnpm test:e2e`(2 tests), `pnpm build`를 모두 통과했다.

## 2026-07-13 — PNG 카드 레이아웃 안정화

- ImageResponse의 flex 축소로 지원 분야와 하단 QR 영역이 겹치던 문제를 수정했다. 카드별 높이·padding·축소 규칙을 명시하고, 가로 2열에만 `flexGrow`를 적용했다.
- 실제 생성한 1080×1350 PNG를 시각 확인해 희망 보스, 역할/파티 유형, 환산/보스 배율, 선택 보스 일러스트, 경험/가능 시간, 음성/분배, QR 푸터가 겹침 없이 출력되는 것을 확인했다.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`(14 files, 40 tests), `pnpm test:e2e`(2 tests), `pnpm build`, `pnpm format:check`을 모두 통과했다.

## 2026-07-13 — 공개 이력서와 저장 PNG 정본 통합

### 구현 범위

- 기존에는 브라우저용 `ResumePreview`와 서버 PNG용 `ResumeShareImage`가 별개라서 저장 파일이 화면과 달랐다. 공개 이력서는 이제 저장 URL과 같은 버전의 PNG를 직접 표시한다.
- PNG는 화면 카드와 같은 다크 헤더, 캐릭터 프레임, 지원 분야 카드, 환산·보스 배율 두 카드, 선택 보스 일러스트, 경험/가능 시간/조건 카드, QR·기준 시각을 1080×1350 한 장에 포함한다.
- 캐릭터 이미지는 기존의 신뢰된 NEXON data URI 처리 방식을 유지했고, 선택 보스 이미지는 카탈로그 키를 검증한 뒤 서버에서 data URI로 인라인했다.
- 저장 파일명은 `메력서-{slug}-v{version}.png`가 되며, 공개 카드의 `src`와 저장 링크의 `href`는 같은 버전 URL이다.
- PNG 렌더러 버전을 이미지 URL에 포함해 기존 게시 버전의 immutable CDN 캐시가 새 카드 디자인을 가로막지 않도록 했다.

### 검증 결과

| 명령 | 결과 |
| --- | --- |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 통과 — 14 files, 40 tests |
| `pnpm test:e2e` | 통과 — Chromium 2 tests (동일 이미지 URL·PNG 1080×1350 검증 포함) |
| `pnpm build` | 통과 |
| `pnpm format:check` | 통과 |

## 2026-07-13 — 보스 일러스트·지원 조건·참고 지표 정리

### 구현 범위

- Maple Trackers 운영자가 사용을 허가한 보스 원본 24개를 키별 정적 자산으로 등록하고, 선택 보스와 같은 키의 이미지만 카드와 미리보기에 표시했다. 기존의 주간/월간 공용 fallback 이미지는 제거했다.
- 보스명에 이미 포함된 난이도 필드를 도메인 모델, 검증, 저장 JSON, 작성 화면, 공개 미리보기, 공유 PNG, seed 데이터에서 제거했다. 역할과 파티 유형은 빈 칸 없이 2열로 유지한다.
- 환산 또는 보스 배율 중 하나만 입력돼도 미리보기에는 두 항목을 모두 표시하고, 입력되지 않은 값에는 `입력 필요`를 표시한다. 데스크톱의 남는 영역에는 선택 보스 일러스트를, 모바일에는 읽기 쉬운 세로 배치를 사용한다.

### 검증 결과

| 명령 | 결과 |
| --- | --- |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 통과 — 14 files, 40 tests |
| `pnpm test:e2e` | 통과 — Chromium 2 tests (선택 보스 아트 경로·375px 모바일 포함) |
| `pnpm build` | 통과 |
| `pnpm format:check` | 통과 |

## 2026-07-13 — 메력서 / RESUMAE 브랜드 전환

### 구현 범위

- 사용자 노출 제품명을 `메력서`로, 영문 보조 표기를 `RESUMAE`로 바꿨다. 기존 `MEYUKBU_*` 환경변수, 저장소 이름, DB·cookie 내부 식별자는 기존 배포와 편집 권한 호환성을 위해 유지했다.
- 모든 화면과 문서에서 `사용자 입력` 문구를 제거하고 `작성 내용` 출처 배지로 통일했다. API 조회·서비스 계산·서비스 관측과의 구분은 그대로 유지한다.
- 투명 여백이 있는 캐릭터 스프라이트는 웹 미리보기와 1080×1350 PNG에서 클리핑 영역 안에 1.9배 확대해 정사각형을 시각적으로 채운다.
- built-in image generation으로 `MAPLE-RESUME` 문서철 일러스트를 만들고 `public/og-maple-resume.png` 및 Open Graph/Twitter 메타데이터에 연결했다.

### 최종 검증

| 명령 | 결과 |
| --- | --- |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 통과 — 10 files, 35 tests |
| `pnpm test:e2e` | 통과 — Chromium 2 tests |
| `pnpm build` | 통과 — Next.js production build |
| `pnpm format:check` | 통과 |
| `git diff --check` | 통과 |

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
- 편집기에 주간/월간 보스 구분과 보스 빠른 선택을 추가했다. 사용자가 `maple-trackers.com` 운영자로서 사용을 허가한 보스 원본은 선택한 보스 키와 1:1로 연결된 정적 자산으로 표시하며, 보스와 무관한 주기별 fallback은 사용하지 않는다.
- 공개 검증 페이지에는 전투력·최종 능력치·현재 장착 전투 장비의 접기식 상세와 심볼·세트 효과·캐시 장비 섹션을 추가했다. 공유 PNG는 기존대로 핵심 요약만 표시한다.

### 확장 단위 검증

| 명령 | 결과 |
| --- | --- |
| `tsc --noEmit` | 통과 — 확장된 profile 및 보스 구분 타입 검증 |
| `vitest run` | 통과 — 4 files, 17 tests; 전투력 원값·장비 정규화·부분 응답·보스 구분 검증 포함 |

전체 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build` 결과는 확장 코드 통합 후의 최종 검증 항목으로 유지한다.

## 2026-07-12 — 메력서 가독성·장비 상세 UX 보완

### 구현 범위

- 메력서 카드와 1080×1350 공유 PNG에서 기존 핵심 역량 API 수치 카드를 제거했다. `환산`은 MapleScouter 확인 값을 받는 별도 편집 섹션으로 옮겼고, 게시물에는 `작성 내용` 출처로만 표시한다.
- 배경, 패널, 입력 필드, 버튼, 출처/신선도 배지를 고대비 다크 테마로 통일했다. 포커스 outline을 유지해 모바일·키보드 사용성도 함께 보강했다.
- 주간·월간 보스 선택 카드는 배경 이미지를 crop하지 않고 우측에 고정하고, 좌측 텍스트를 어두운 패널 위에 분리해 보스명·설명·선택 상태가 배경과 섞이지 않게 했다.
- 장착 장비 상세는 MapleScouter식 정보 우선순위를 참고해 실제 API 반환값만으로 아이콘, 스타포스, 최종/기본/추가/특수/기타 옵션, 잠재능력, 에디셔널 잠재능력을 고대비로 표시한다. API에 없는 옵션은 만들지 않고 숨긴다.
- 장비 상세 렌더링 회귀를 막는 컴포넌트 테스트를 추가했다.
- 공유 링크에는 다크·민트 톤의 `public/og.png`와 Open Graph/Twitter 메타데이터를 연결했다. 브랜드·게임 로고 및 공식 캐릭터를 포함하지 않은 자체 일러스트만 사용한다.

### 최종 검증

| 명령 | 결과 |
| --- | --- |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 통과 — 7 files, 24 tests |
| `pnpm test:e2e` | 통과 — Chromium 2 tests (게시·검증·PNG·갱신 / 375px 모바일) |
| `pnpm build` | 통과 — production build |
| `pnpm format:check` | 통과 |
| `git diff --check` | 통과 |

## 2026-07-13 — 이력서 작성 경험 재설계

### 구현 범위

- `환산·보스 배율 참고`에서 사용자가 외부 서비스에서 직접 확인한 환산값과 보스 배율(%)을 입력할 수 있게 했다. 두 값은 DB JSON과 immutable version에 저장되며, 편집기 미리보기·공개 검증 페이지·1080×1350 PNG에 `작성 내용` 출처로 표시한다.
- MapleScouter 값은 자동 수집·복사·계산하지 않는다. 닉네임별 외부 참고 링크는 유지하고, 보스 배율은 `%` 기호 없이 숫자로 입력하도록 검증한다.
- 홈페이지에서 `샘플로 체험하기`와 임의 캐릭터 링크를 제거했다. 실제 검색 폼을 중심으로 메력서 초안 구조, 작성 단계, 출처·공개 원칙을 보여 준다.
- 홈·편집기·공개 검증·고지 페이지를 밝은 종이색, 잉크색 본문, 문서 번호, 검증 메모 영역으로 통일했다. 주간·월간 보스 아트는 작은 문서형 선택 카드로 유지했다.
- 새로운 Open Graph 카드 `public/og-resume-v2.png`를 추가하고 메타데이터가 이를 사용하도록 변경했다. 생성 도구는 built-in image generation이며, 문서철·이력서 콘셉트를 반영했다.
- E2E는 샘플 체험 삭제, 환산·보스 배율 입력 후 게시·검증·PNG 흐름을 함께 확인한다.

### 최종 검증

| 명령 | 결과 |
| --- | --- |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 통과 — 10 files, 34 tests |
| `pnpm test:e2e` | 통과 — Chromium 2 tests |
| `pnpm build` | 통과 — Next.js production build |
| `pnpm format:check` | 통과 |
| `git diff --check` | 통과 |

## 2026-07-13 — 장비 UI 간소화와 외부 지표 안전 경계

### 구현 범위

- 편집기와 공개 검증 페이지에서 장비·심볼·세트 효과·캐시 장비 상세 창을 제거했다. NEXON API 응답과 snapshot 저장 경계는 기존 공개 버전 및 API 호환성을 위해 유지한다.
- 공개 검증 상세에는 전투력과 최종 능력치만 남겼다. API가 공개하지 않은 값은 만들지 않는다.
- 캐릭터 이미지는 더 큰 정사각형 영역을 `object-fit: cover`로 채우며, 공유 PNG의 아바타도 함께 확대했다.
- `담당 역할 설명`을 `어필 포인트`로 변경하고, 공유 PNG에도 짧게 포함했다.
- MapleScouter 공개 이용약관의 자동화 접근·타 서비스 데이터 소스 사용 제한에 따라 환산 및 보스 배율을 자동 수집하지 않았다. 닉네임별 외부 참고 링크만 제공하며, 서면 허가와 문서화된 파트너 API가 있어야 자동 연동을 추가한다.
- E2E 서버는 실행 환경의 live API 키와 Prisma 저장소를 상속하지 않도록 mock provider와 memory storage를 강제해, 재현 가능한 전체 흐름을 검증한다.

### 최종 검증

| 명령 | 결과 |
| --- | --- |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 통과 — 9 files, 31 tests |
| `pnpm test:e2e` | 통과 — Chromium 2 tests (검색·게시·검증·PNG·갱신 / 375px 모바일) |
| `pnpm build` | 통과 — Next.js production build |
| `pnpm format:check` | 통과 |
| `git diff --check` | 통과 |

### 남은 외부 설정

- MapleScouter 환산값과 보스 배율(%)의 자동 표시는 운영자의 서면 허가와 문서화된 파트너 API가 있어야 한다. 그 전에는 외부 페이지에서 사용자가 직접 확인하는 링크만 사용한다.

## 2026-07-12 — 원격 변경 통합 및 최종 검증

### 통합 범위

- 원격 `main`에 추가된 최고 전투력 서비스 관측, API 수치 천 단위 표기, Prisma migration용 Vercel build pipeline을 보존했다.
- 환산 값은 `convertedStat` 하나로 통일했다. 별도의 중복 저장 필드는 제거했으며, 입력 설명은 독립된 `환산 (MapleScouter 기준)` 섹션에만 남긴다.
- 편집기와 공개 검증 페이지는 같은 고대비 장비 상세 카드로 API가 제공한 아이콘, 스타포스, 옵션, 잠재능력, 에디셔널 잠재능력을 표시한다.

### 최종 검증

| 명령 | 결과 |
| --- | --- |
| `pnpm db:generate` | 통과 — Prisma Client 재생성 |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 통과 — 8 files, 30 tests |
| `pnpm test:e2e` | 통과 — Chromium 2 tests |
| `pnpm build` | 통과 — production build |
| `pnpm format:check` | 통과 |
| `git diff --check` | 통과 |

## 2026-07-13 — 보스 카드 일러스트 보정

### 구현 범위

- 선택 전 주간 보스 카드의 대표 일러스트를 유피테르(`jupiter`)로 변경했다. 빠른 선택에서 특정 보스를 고르면 기존처럼 해당 보스의 일러스트를 우선한다.
- 주간·월간 보스 카드의 일러스트를 각각 여백 있는 전용 영역에 중앙 정렬 `object-contain`으로 표시했다. 텍스트 그라데이션이 그림을 덮거나 hover 확대가 가장자리를 자르지 않도록 조정했다.
- 기본 아트 키의 회귀를 막기 위해 주간=`jupiter`, 월간=`blackmage`, 허용 키 존재 여부를 검증하는 테스트를 추가했다.

### 최종 검증

| 명령 | 결과 |
| --- | --- |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 통과 — 11 files, 36 tests |
| `pnpm test:e2e` | 통과 — Chromium 2 tests |
| `pnpm build` | 통과 — production build |
| `pnpm format:check` | 통과 |
| `git diff --check` | 통과 |

## 2026-07-13 — 편집기 안내 및 결과물 워터마크 보정

### 구현 범위

- 선택 보강 API 실패를 묶어 표시하던 편집 화면의 상단 안내 상자를 제거했다. 기본·전투력 API의 실제 조회 실패는 전투력 섹션의 개별 안내로 계속 드러나며, 데모 모드임을 알리는 표시는 메력서 미리보기에 유지한다.
- `실시간 NEXON Open API 조회 결과` 안내에 진한 초록 글자, 선명한 배경·테두리, 굵은 글꼴을 적용해 낮은 대비를 해소했다.
- 환산·보스 배율 입력 앞의 파트너 API 사용 권한 안내 문구를 제거하고, 외부 확인 링크와 직접 입력 기능은 유지했다.
- `크로아/얀보 제작` 워터마크를 편집 미리보기와 공개 검증 메력서의 하단 우측, 1080×1350 PNG의 안전 여백 안쪽 우측 하단에 추가했다. 결과물 외의 홈·헤더·OG 이미지는 변경하지 않았다.
- PNG 응답은 immutable 캐시이므로 다운로드 및 생성 응답 URL에 `template=2`를 추가해 기존 캐시와 구분했다.

### 최종 검증

| 명령 | 결과 |
| --- | --- |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 통과 — 11 files, 36 tests |
| `pnpm test:e2e` | 통과 — Chromium 2 tests |
| `pnpm build` | 통과 — production build |
| `pnpm format:check` | 통과 |
| `git diff --check` | 통과 |

## 2026-07-13 — 보스 선택 제한 및 사이트 워터마크

### 구현 범위

- 희망 보스의 자유 텍스트 입력과 `직접 입력` 선택지를 제거했다. 주간·월간 카드 또는 목록을 선택하면 주기와 공식 보스명이 함께 저장되며, 주간 기본값은 유피테르(노멀), 월간 기본값은 검은 마법사(하드)이다.
- 새 작성·수정 요청은 주기와 일치하는 카탈로그 보스명만 통과하도록 Zod 검증을 강화했다. 과거 공개 버전의 JSON 파서는 느슨하게 유지해 이미 발행된 기록을 조용히 바꾸거나 읽지 못하게 하지 않는다.
- `크로아/얀보 제작`을 결과물 내부와 1080×1350 PNG에서 제거하고, 루트 레이아웃의 고정·비상호작용 워터마크로 옮겼다. 모바일 safe area와 `pointer-events: none`을 적용해 터치를 가로막지 않는다.
- 실제 375×812 in-app browser에서 홈·작성 화면·게시 버튼을 점검했다. 문서 폭 360px / viewport 375px으로 가로 넘침이 없었고, 워터마크·보스 선택·CTA가 모두 표시됐다.

### 최종 검증

| 명령 | 결과 |
| --- | --- |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 통과 — 13 files, 38 tests |
| `pnpm test:e2e` | 통과 — Chromium 2 tests (375px 모바일 포함) |
| `pnpm build` | 통과 — production build |
| `pnpm format:check` | 통과 |
| `git diff --check` | 통과 |

## 2026-07-13 — NanumBarunGothic 글꼴 및 브라우저 아이콘

### 구현 범위

- 참조한 메이플스토리 테스트월드 공지의 본문 글꼴을 확인해, 웹의 기본·브랜드·제목 서체를 `NanumBarunGothic`으로 통일했다.
- `next/font/local`로 굵기 400·700의 로컬 WOFF 파일을 번들한다. 따라서 클라이언트는 글꼴 CDN에 의존하지 않으며, 폰트 로딩 중에는 한글 시스템 글꼴로 자연스럽게 대체된다.
- 1080×1350 공유 PNG도 같은 Regular/Bold 글꼴을 `ImageResponse`에 등록해 웹과 결과물의 인상을 맞췄다.
- 기존 기본 `favicon.ico`를 제거하고, 네이비 문서·빨간 기준선으로 구성된 Resumae 전용 `icon.svg`를 App Router 아이콘으로 등록했다.
- E2E가 새 `/icon.svg` 링크와 PNG 생성 흐름을 함께 확인하도록 보강했다.

### 최종 검증

| 명령 | 결과 |
| --- | --- |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 통과 — 13 files, 38 tests |
| `pnpm test:e2e` | 통과 — Chromium 2 tests (새 아이콘 링크 포함) |
| `pnpm build` | 통과 — `/icon.svg` 정적 라우트 생성 확인 |

## 2026-07-13 — 미리보기 가독성 및 캐릭터 원본 품질

### 구현 범위

- 미리보기 헤더·푸터에 항상 짙은 네이비 배경을 적용했다. 이로써 밝은 제목·보조 글자가 종이 배경 위에 출력되던 문제를 없애고, 헤더의 밝은 teal/slate 텍스트와 충분한 대비를 확보했다.
- 캐릭터 이미지는 최근접 보간(`image-rendering: pixelated`)을 제거해 브라우저의 기본 보간을 사용한다. 투명 여백은 유지하되 `object-contain`과 1.55배 확대를 써서 1.9배 확대의 블록 현상을 줄였다.
- 공유 PNG도 같은 1.55배 확대·`object-contain` 정책을 사용한다. NEXON이 현재 제공하는 300×300 원본을 그대로 사용하며, 존재하지 않는 고해상도 API URL이나 인위적인 업스케일은 추가하지 않았다.

### 최종 검증

| 명령 | 결과 |
| --- | --- |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 통과 — 13 files, 38 tests |
| `pnpm test:e2e` | 통과 — Chromium 2 tests (375px 모바일 및 PNG 생성 포함) |
| `pnpm build` | 통과 |

## 2026-07-13 — 전체 한글 타이포그래피 안정화

### 구현 범위

- NanumBarunGothic의 실제 로컬 굵기인 400·700만 화면에 사용하도록 정리했다. Tailwind의 `font-black`·`font-extrabold`는 700으로 정규화하고 `font-synthesis: none`으로 브라우저의 가짜 굵기 생성을 막았다.
- 한글 제목의 `tracking-tight`과 이력서 제목의 음수 자간을 정상 자간으로 되돌렸다. 강한 굵기와 글자 간격이 겹치며 획이 뭉개져 보이던 문제를 해결한다.
- OS의 기본 글자 렌더링을 쓰도록 전역 강제 안티앨리어싱을 제거했다. `next/font/local`의 fallback 크기 조정도 끄고, 시스템 한글 글꼴 fallback이 자연스럽게 이어지도록 했다.
- 보조 본문색을 `#5d6875`, 입력 placeholder를 `#687380`으로 조정해 밝은 종이 배경에서도 본문 대비를 4.5:1 이상으로 올렸다.
- 1080×1350 공유 PNG도 Bold(700)만 사용하도록 같은 정책을 적용했다.

### 최종 검증

| 명령 | 결과 |
| --- | --- |
| `pnpm lint` | 통과 |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 통과 — 13 files, 38 tests |
| `pnpm test:e2e` | 통과 — Chromium 2 tests (글꼴 합성 차단·700 굵기·375px 모바일 포함) |
| `pnpm build` | 통과 |
