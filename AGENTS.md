# AGENTS.md — 메력서(Resumae) 개발 지침

이 저장소의 목표는 메이플스토리 캐릭터 정보를 NEXON Open API로 조회하고, 파티 구직에 필요한 작성 내용을 결합해 **검증 가능한 한 장짜리 메력서**를 생성하는 웹 서비스를 구현하는 것이다.

Codex는 작업을 시작하기 전에 반드시 다음 파일을 읽는다.

1. `docs/PRODUCT_SPEC.md`
2. `docs/ARCHITECTURE.md`
3. `docs/UX_COPY.md`
4. `docs/ACCEPTANCE_CRITERIA.md`
5. `spec/project.yaml`
6. 현재 작업 파일(`tasks/*.md`)

문서가 구현과 충돌하면 우선순위는 `AGENTS.md` → 현재 task → acceptance criteria → architecture → product spec 순이다. 불명확한 부분은 합리적인 기본값으로 구현하고 `docs/DECISIONS.md`에 근거를 기록한다. 비밀키가 없더라도 질문만 하고 멈추지 말고 mock/demo 모드로 끝까지 구현한다.

## 1. 제품의 핵심 원칙

- 제품명: **메력서**
- 결과물명: **메력서**
- 한 줄 정의: 캐릭터명과 지원 조건을 입력하면 NEXON Open API 기반의 파티 구직용 캐릭터 이력서 이미지와 검증 URL을 생성한다.
- 핵심 가치: 예쁜 이미지가 아니라 **출처와 기준 시각을 확인할 수 있는 검증 가능한 프로필**이다.
- 메력서 이미지에는 반드시 데이터 기준 시각, 데이터 출처 배지, QR 또는 검증 URL, “Data based on NEXON Open API” 문구를 표시한다.
- 단일 종합 점수, 합격/불합격 판정, 익명 평판, 블랙리스트는 만들지 않는다.
- 직업별 편향을 줄이기 위해 역할별로 정보의 표시 우선순위만 다르게 하고, 이용자를 하나의 점수로 줄이지 않는다.
- API 조회값, 서비스 계산값, 작성 내용, 서비스 관측값을 시각적으로 명확히 구분한다.

## 2. 구현 목표

Codex는 단순 목업이나 정적 화면에서 멈추지 않는다. 다음 vertical slice가 실제로 동작해야 한다.

1. 캐릭터명 검색
2. NEXON API 또는 mock fixture로 캐릭터 정보 조회
3. 목표 보스·난이도·역할·파티 유형·가능 시간·음성 채팅·분배 방식·경험 입력
4. 모바일 편집 화면에서 메력서 실시간 미리보기
5. 저장 및 공개 slug 생성
6. 공개 검증 페이지 표시
7. 1080×1350 공유 이미지 생성
8. QR/검증 URL을 통해 공개 페이지로 이동
9. 데이터 기준 시각 및 stale/expired 상태 표시
10. 테스트, 린트, 타입 검사, production build 통과

## 3. 권장 기술 스택

새 저장소라면 생성 시점의 상호 호환되는 최신 안정 버전을 사용하고 lockfile에 정확한 버전을 고정한다.

- Next.js App Router
- React + TypeScript `strict: true`
- pnpm
- Tailwind CSS
- 접근 가능한 headless UI 또는 shadcn/ui; 필요한 컴포넌트만 추가
- Zod: 환경변수, 외부 API 응답, 폼 입력 검증
- PostgreSQL + Prisma ORM
- 로컬 개발용 Docker Compose PostgreSQL
- Vitest + Testing Library
- Playwright
- ESLint + Prettier
- 서버 이미지 생성: Next.js `ImageResponse` 또는 동등한 서버 렌더링 방식
- QR 생성 라이브러리

불필요한 상태관리 라이브러리와 대형 UI 패키지를 추가하지 않는다. 서버 컴포넌트를 기본으로 사용하고, 상호작용이 필요한 최소 영역만 클라이언트 컴포넌트로 만든다.

## 4. 저장소 및 코드 규칙

- `src/` 구조를 사용한다.
- 도메인, 외부 API, 데이터 저장, UI를 분리한다.
- NEXON 응답 필드를 페이지 컴포넌트가 직접 읽지 않는다. 반드시 `src/lib/nexon` 어댑터와 normalized domain model을 통과한다.
- NEXON endpoint, 응답 schema, field mapping은 한 곳에서 관리한다.
- 공개 함수와 복잡한 도메인 규칙에는 짧은 TSDoc을 작성한다.
- `any`, 무검증 type assertion, 비어 있는 catch, 비밀키 로그 출력을 금지한다.
- 작성자가 제공한 HTML을 렌더링하지 않는다. 모든 문자열은 plain text로 취급하고 길이를 제한한다.
- 날짜·시간은 DB에 UTC로 저장하고 UI에서 `Asia/Seoul` 기준으로 표시한다.
- 한국어가 기본 언어다. copy는 `src/content/ko.ts` 또는 유사한 중앙 파일에 둔다.
- UI에는 NEXON 또는 메이플스토리의 비공개/무단 브랜드 에셋을 번들하지 않는다. API에서 제공된 캐릭터 이미지와 사용 허가가 명확한 자체 UI만 사용한다.
- 모든 공개 페이지는 모바일 우선, 키보드 사용 가능, 명확한 focus 상태, label, 오류 메시지를 갖는다.

## 5. 필수 페이지와 API

권장 라우트이며, 더 나은 구조가 있으면 이유를 `docs/DECISIONS.md`에 남기고 변경할 수 있다.

### 페이지

- `/` — 소개, 캐릭터 검색, 샘플 메력서
- `/create` — 검색 결과 기반 편집기
- `/r/[slug]` — 공개 검증 프로필
- `/r/[slug]/image` — 공유 PNG
- `/privacy` — 수집 정보와 공개 범위 안내
- `/terms` — 서비스 고지 및 비제휴 안내

### Route handlers

- `GET /api/characters/resolve?name=`
- `POST /api/resumes`
- `GET /api/resumes/[slug]`
- `POST /api/resumes/[slug]/refresh`
- `PATCH /api/resumes/[slug]`
- `DELETE /api/resumes/[slug]`
- `GET /api/health`

변경·삭제는 공개 slug만으로 허용하지 않는다. 초기 MVP에서는 생성 시 발급한 edit token을 HttpOnly/SameSite cookie에 저장하고 DB에는 hash만 보관한다. 이후 로그인 도입이 쉬운 인터페이스로 만든다.

## 6. NEXON Open API 규칙

- Base URL과 API key는 server-only 환경변수로 관리한다.
- API key는 브라우저 bundle, HTML, error response, 로그에 노출하지 않는다.
- 요청 header는 `x-nxopen-api-key`를 사용한다.
- 실 API 구현 전에 현재 공식 NEXON 문서를 확인해 endpoint와 response schema를 `docs/NEXON_API_MAP.md`에 기록한다.
- 공식 문서를 확인할 수 없는 환경에서는 fixture 기반 mock provider를 완성하고, 실 provider는 명확한 adapter boundary와 검증 실패 메시지를 갖게 한다. 필드를 추측해 정상 데이터인 것처럼 표시하지 않는다.
- 우선 지원 범주: 캐릭터 식별자, 기본 정보, 종합 능력치, 장비 요약, HEXA 관련 정보, 유니온, 무릉/공식 기록, 현재 길드. 실제 공개 API에 없는 항목은 작성 내용 또는 “지원하지 않음”으로 처리한다.
- 외부 API 호출은 timeout, retry with jitter, rate limit, error mapping, cache를 적용한다. 429와 유지보수 오류를 사용자가 이해할 수 있는 한국어로 변환한다.
- 동일 캐릭터 반복 조회를 캐시하되 `fetchedAt`, `sourceDate`, provider를 저장한다.
- 공개 데이터는 30일 이상 방치하지 않는다. 24시간 이후에는 stale 경고, 30일 이후에는 expired 처리하고 갱신 전까지 API 파생 값을 공개하지 않는 정책을 기본값으로 한다. 실제 약관 검토 결과에 따라 더 엄격하게 조정한다.
- 화면과 이미지 하단에 “Data based on NEXON Open API”와 비제휴 고지를 표시한다.

## 7. 데이터 출처 라벨

도메인 enum을 만들고 모든 표시 필드에 출처를 연결한다.

```ts
export type DataProvenance =
  | "NEXON_API"
  | "SERVICE_CALCULATED"
  | "USER_PROVIDED"
  | "SERVICE_OBSERVED";
```

한국어 배지는 각각 다음을 사용한다.

- `NEXON_API` → `API 조회`
- `SERVICE_CALCULATED` → `서비스 계산`
- `USER_PROVIDED` → `작성 내용`
- `SERVICE_OBSERVED` → `서비스 관측`

“공식 인증”, “검증 완료”, “넥슨 인증”처럼 제휴 또는 보증으로 오해할 표현을 사용하지 않는다.

## 8. 계산 지표

- 환산, 배율, 성장 점수 등 공식 API의 단일 필드가 아닌 값은 기본적으로 숨기거나 experimental로 둔다.
- 계산 기능을 구현할 때는 calculator name, algorithm version, calculatedAt, input snapshot id, 포함/제외 항목, disclaimer를 함께 저장하고 표시한다.
- 계산 공식을 알 수 없으면 임의로 만들지 않는다.
- 사용자 직접 입력 환산값과 서비스 계산값은 별도 항목이며 출처 배지를 다르게 표시한다.

## 9. 길드 이력

- 현재 길드는 API에서 조회 가능한 경우 `NEXON_API`로 표시한다.
- 과거 길드 이력은 서비스가 관측한 시점부터만 생성한다.
- “가입일/탈퇴일”로 단정하지 말고 `관측 시작`, `마지막 관측`, `관측 종료`를 사용한다.
- 신규 snapshot의 현재 길드가 직전 관측값과 다를 때 기존 observation을 닫고 새 observation을 만든다.
- 서비스 이전 과거 이력의 작성 내용은 `USER_PROVIDED`로만 표시한다.

## 10. 메력서 카드

공유 이미지 크기는 1080×1350이다. 작은 모바일 채팅 미리보기에서도 다음 순서가 읽혀야 한다.

1. 캐릭터 이미지, 캐릭터명, 월드, 직업, 레벨, 현재 길드
2. 지원 보스, 난이도, 역할, 파티 유형
3. 핵심 지표 4~6개
4. 성장/공식 기록 요약
5. 파티 경험과 가능한 시간
6. 음성 채팅, 분배 방식 등 희망 조건
7. 데이터 기준 시각, 출처 범례, QR/짧은 URL, NEXON 데이터 고지

세부 장비 옵션 전체를 이미지에 넣지 않는다. 상세 정보는 공개 검증 페이지에서 펼쳐 본다. API에 값이 없거나 비공개면 `0`으로 표시하지 말고 `조회 불가` 또는 섹션 숨김으로 처리한다.

## 11. 신선도 및 무결성

- `fresh`: 24시간 미만
- `stale`: 24시간 이상 30일 미만
- `expired`: 30일 이상
- 기준값은 환경변수로 조정 가능하게 한다.
- 공개 이미지와 검증 페이지는 동일한 snapshot/version을 참조한다.
- 메력서마다 content hash와 human-readable version을 생성한다.
- 갱신 시 기존 이미지를 조용히 바꾸지 말고 새 version을 만든다. 공개 페이지는 최신 version과 이미지가 참조하는 version을 구분해서 보여 준다.
- 오래된 이미지로 접속하면 “최신 버전이 있습니다”를 표시한다.

## 12. 보안 및 개인정보

- 연락처는 선택 입력, 기본 비공개다.
- 전화번호·실명·주소를 요구하지 않는다.
- contact field는 허용된 타입(예: Discord handle, 오픈채팅 설명, 커뮤니티 닉네임)과 짧은 문자열만 허용한다.
- API mutation에 CSRF 방어, 동일 출처 검사, rate limit, schema validation을 적용한다.
- edit token은 cryptographically secure random으로 생성하고 hash만 저장한다.
- 로그에는 캐릭터명 외 민감정보, raw contact, token, API key를 남기지 않는다.
- 신고 모델과 공개 중단 상태를 설계하되 복잡한 관리자 UI는 MVP 이후로 둔다.

## 13. Demo/mock 모드

`NEXON_OPEN_API_KEY`가 없거나 `NEXON_PROVIDER=mock`이면 fixture로 전체 사용자 흐름이 동작해야 한다.

- 현실적인 한국어 샘플 캐릭터 2개 이상
- 서로 다른 역할/직업 우선순위
- 정상, 일부 데이터 누락, stale 상태 fixture
- mock임을 화면에 명확히 표시
- 테스트는 외부 네트워크 없이 mock provider만으로 재현 가능

## 14. 테스트 및 완료 조건

모든 기능 변경 후 다음을 실행하고 실패를 해결한다.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

최소 테스트 대상:

- NEXON error code mapping
- external response → normalized profile mapping
- provenance label과 누락 데이터 처리
- fresh/stale/expired 계산
- 길드 관측 transition
- 작성 내용 Zod validation 및 길이 제한
- edit token 권한
- 공개 slug 충돌 방지
- content hash/version 안정성
- mock 검색 → 작성 → 게시 → 검증 → 이미지 E2E
- 모바일 viewport 접근성 핵심 흐름

테스트를 삭제하거나 skip해서 통과시키지 않는다. 환경 제약으로 E2E를 실행할 수 없다면 원인과 재현 명령을 `docs/IMPLEMENTATION_LOG.md`에 기록하고 나머지는 실행한다.

## 15. 작업 방식

- 먼저 현재 저장소와 문서를 조사하고 `docs/IMPLEMENTATION_PLAN.md`에 체크리스트를 작성한다.
- 기능을 작은 vertical slice로 구현한다.
- 각 단계 후 테스트를 실행하고 `docs/IMPLEMENTATION_LOG.md`를 갱신한다.
- 기존 코드가 있으면 무작정 덮어쓰지 말고 패턴을 따른다.
- 비밀키, 배포 계정, 유료 서비스가 없다는 이유로 구현을 중단하지 않는다. adapter와 mock을 사용한다.
- 사용자 승인 없이 파괴적인 DB reset, 기존 데이터 삭제, force push를 하지 않는다.
- 최종 응답에는 구현 내용, 변경 파일, 실행 명령, 남은 외부 설정, 테스트 결과를 정확히 요약한다.

## 16. 금지 사항

- 정적 목업만 만들고 완료했다고 보고
- NEXON API key를 클라이언트에서 호출
- 공식 API에 없는 필드를 추측해서 표시
- 메이플스토리/넥슨과 공식 제휴된 것처럼 표현
- 단일 종합 점수나 합격 판정
- 작성 내용을 API 조회값처럼 표시
- 데이터 기준 시각 없는 공유 이미지
- 공개 slug만으로 수정·삭제 허용
- 실패 테스트를 제거하거나 무시
- 로컬에서만 우연히 동작하는 하드코딩 경로
