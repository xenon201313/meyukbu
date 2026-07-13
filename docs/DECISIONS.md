# 구현 결정 기록

## D-001: mock/test용 메모리 저장소와 production PostgreSQL

**상태:** 채택  
**결정일:** 2026-07-12

### 배경

메력부는 API key나 Docker/PostgreSQL이 없는 환경에서도 mock provider로 검색부터 게시, 검증, PNG 생성까지 재현 가능해야 한다. 동시에 공개 메력서는 edit token hash, immutable version, snapshot, 길드 관측을 지속적으로 보존해야 하므로 production에서는 영속 저장소가 필요하다.

### 결정

`ResumeRepository` 인터페이스를 기준으로 두 구현을 둔다.

- `MemoryResumeRepository`: 테스트와 DB가 없는 비운영 mock 데모에서 사용한다. 프로세스 메모리에만 저장되며 프로세스 재시작 시 데이터가 사라진다.
- `PrismaResumeRepository`: `DATABASE_URL`이 설정된 로컬 개발 및 모든 production 환경에서 사용한다. 스키마는 `prisma/schema.prisma`와 PostgreSQL을 기준으로 한다.

선택 규칙은 다음과 같다.

1. `NODE_ENV=test`는 항상 메모리 저장소를 사용해 외부 DB 없이 결정적으로 실행한다.
2. 비운영 환경에서 `NEXON_PROVIDER=mock`이고 PostgreSQL이 설정되지 않았거나 연결할 수 없으면 메모리 저장소를 사용한다.
3. `DATABASE_URL`이 정상이고 개발자가 로컬 DB를 시작한 경우에는 mock provider여도 Prisma 저장소를 사용할 수 있다. 이는 migration/seed와 공개 버전 보존을 수동으로 검증하기 위함이다.
4. `NODE_ENV=production`에서는 메모리 fallback을 절대 사용하지 않는다. `DATABASE_URL`이 없거나 연결할 수 없으면 쓰기를 시작하지 않고 `/api/health`를 unhealthy로 표시한다.

### 결과와 안전장치

- 메모리 구현도 slug 충돌 방지, edit-token hash 비교, immutable `ResumeVersion`, snapshot/version 일치 규칙을 Prisma 구현과 동일하게 지킨다.
- 메모리 데이터는 단일 프로세스 데모 전용이다. 여러 인스턴스, 배포 재시작, 공개 URL의 지속성에 의존하지 않는다.
- production은 `pnpm prisma migrate deploy`를 배포 단계에 실행하고 PostgreSQL 백업/접근 제어를 운영한다.
- live NEXON key가 없다는 이유만으로 DB/공개 흐름을 중단하지 않는다. provider 선택과 repository 선택은 독립적이다.

## D-002: 실제 API 장비 상세와 주간·월간 보스 선택 경계

**상태:** 채택  
**결정일:** 2026-07-12

### 배경

메력서의 핵심은 이미지에 보이는 요약을 검증 페이지에서 다시 확인할 수 있는 것이다. 사용자는 실제 NEXON Open API로 전투력과 현재 장착 장비를 확인하고, 지원 보스는 주간/월간 구분으로 빠르게 고르길 요청했다. 보스 시각 자산은 NEXON Open API가 제공하지 않지만, 사용자는 `maple-trackers.com`의 운영자이며 해당 사이트의 보스 일러스트 사용을 명시적으로 허가했다. 장비는 API가 반환한 공식 아이콘 URL만 사용한다.

### 결정

1. live provider의 표준 조회는 `id`, `character/basic`, `character/stat`, `character/item-equipment`으로 둔다. `basic`이 정상인 경우 능력치·장비 응답이 부분 실패해도 작성 흐름은 유지하고 availability/notice로 공개한다.
2. 전투력은 `character/stat.final_stat`에서 API가 실제로 반환한 원값만 사용한다. 환산, 전투력 기반 등급, 장비 점수, 합격 판정은 만들지 않는다.
3. 현재 장착 전투 장비는 슬롯, 옵션, 스타포스, 잠재능력, 에디셔널 잠재능력, 소울까지 normalized snapshot에 보존한다. `symbol-equipment`, `cashitem-equipment`, `set-effect`은 선택 보강 호출로 두고, 캐시 장비는 전투 장비와 분리한다.
4. 공유 PNG는 작은 화면의 가독성을 위해 핵심 지표만 요약한다. 전체 장비 옵션은 동일 snapshot/version을 보는 공개 검증 페이지에서만 펼친다.
5. 주간/월간 선택 카드는 작성 내용의 지원 분야를 돕는 UI다. 보스 일러스트는 사용자가 사용을 허가한 Maple Trackers 원본을 정적 자산 manifest로 관리하고, 선택한 보스 키와 1:1로 표시한다. 보스와 무관한 주기별 대체 이미지는 사용하지 않는다.
6. 현재 제품 판단에 쓰지 않는 기록 지표는 profile field, fixture, 편집기, 공개 검증 페이지, 공유 이미지, 문서의 지원 범위에서 제거한다.

### 결과와 안전장치

- API key는 기존과 같이 서버 환경변수와 `x-nxopen-api-key` 헤더에만 사용한다.
- 외부 응답은 Zod schema → normalized domain model → UI 순서로만 흐르며, 페이지가 NEXON JSON을 직접 읽지 않는다.
- API에 없는 값·누락 값은 `0`이나 추측으로 채우지 않는다.
- 보스 구분과 난이도가 포함된 보스명은 `작성 내용` 배지를 유지하고, 장비·전투력은 `API 조회` 배지를 유지한다.
- 장비 화면의 정보 구조는 공개된 참고 화면에서 현재 프리셋·장비 목록·심볼을 구분하는 방식을 검토하되, 외부 서비스의 코드·이미지·계산식·점수 체계는 가져오지 않는다. API 필드와 값의 기준은 NEXON 공식 문서만 사용한다.
- 보스 아트는 사용자가 제공·허가한 Maple Trackers 원본에 한정한다. 난이도는 보스명에 포함하며, 보스명·주기·역할·파티 유형은 작성 내용이고 이 시각 자산이 NEXON의 공식 제휴·인증을 뜻하지 않는다.

## 2026-07-13 — 장비 상세 UI 제거

사용자 요청에 따라 편집기와 공개 검증 페이지의 장비·심볼·세트 효과·캐시 장비 상세 창을 제거한다. 이는 D-002의 공개 장비 상세 UI 부분을 대체한다. 다만 NEXON API 장비 응답의 조회·정규화·snapshot 저장은 기존 공개 메력서와 API 경계를 깨지 않도록 유지한다. 전투력과 최종 능력치만 API 검증 상세로 계속 표시한다.

## 2026-07-13 — MapleScouter 자동 연동 보류

MapleScouter 공개 이용약관 제14조·제15조는 사전 동의 없는 계산 로직/가공 데이터의 재사용, 자동화된 접근, 타 서비스의 백엔드·데이터 소스 사용을 금지한다. 따라서 닉네임 기반 환산·보스 배율을 크롤링하거나 비공개 endpoint를 호출하지 않는다. 자동 표시 기능은 운영자의 서면 허가 및 문서화된 파트너 API가 제공될 때만 server-only adapter로 추가한다. 그 전에는 사용자가 직접 여는 외부 참고 링크만 제공한다. 작성자가 직접 확인한 값은 선택적으로 기록할 수 있지만 `작성 내용` 출처로만 표시하며, 서비스가 값을 복사·추측·계산하지 않는다.

## 2026-07-13 — 이력서형 작성 화면

사용자 요청에 따라 메력서의 기본 시각 언어를 게임 대시보드가 아닌 밝은 문서철·이력서로 바꾼다. 홈은 임의 샘플 캐릭터 대신 실제 검색과 작성 순서를 보여 주고, 편집기·공개 검증 페이지는 번호가 있는 작성 섹션·종이형 패널·검증 메모 영역을 사용한다. API 조회값과 작성 내용의 구분, 모바일 접근성, 높은 명도 대비는 유지한다.

## 2026-07-13 — 메력서 / RESUMAE 브랜드 전환

사용자 노출 브랜드를 `메력부`에서 `메력서`로, 영문 표기를 `RESUMAE`로 전환한다. 소셜 썸네일은 `MAPLE RESUME` 문구를 포함한 자체 생성 문서철 일러스트로 교체한다. 기존 환경변수, 저장소 이름, 데이터베이스·쿠키 내부 식별자는 운영 호환성을 위해 변경하지 않는다.

## 2026-07-13 — 캐릭터 외형 원본 보존

NEXON Open API의 캐릭터 외형 이미지는 2025-08-21 이후 300×300 고정이며 `width`·`height`·좌표 파라미터를 사용할 수 없다. 따라서 존재하지 않는 고해상도 URL을 추측하거나 AI 업스케일 이미지를 만들지 않는다. API가 준 원본 URL을 그대로 사용하고, 웹 미리보기에서는 `image-rendering: auto`와 `object-contain`으로 자연스러운 보간을 유지한다. 캐릭터가 충분히 보이도록 확대율은 1.55배로 제한하고, 1080×1350 PNG도 같은 확대율·contain 정책을 사용한다.

## 2026-07-13 — 한글 글꼴 굵기와 자간 안정화

사용자가 요청한 NanumBarunGothic은 Regular(400)·Bold(700)만 로컬 번들로 제공한다. 따라서 800·900 굵기를 합성해 획이 뭉개지는 일을 피하기 위해, 화면의 `font-black`·`font-extrabold`와 공유 PNG의 800 굵기를 모두 700으로 정규화한다. `font-synthesis: none`을 적용하고, 한글 제목의 음수 자간은 제거한다. 이는 요청한 글꼴 자체는 유지하면서 Windows·모바일에서의 가독성을 우선하는 결정이다.
