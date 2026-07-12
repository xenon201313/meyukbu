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
5. 주간/월간 선택 카드는 사용자 입력의 지원 분야를 돕는 UI다. 보스 일러스트는 사용자가 사용을 허가한 `maple-trackers.com` 원본을 `/api/boss-art/[key]` 어댑터로 요청한다. 이 저장소에는 해당 이미지를 복제하지 않으며, source가 꺼져 있거나 offline 테스트 중이면 중립적인 fallback을 사용한다.
6. 현재 제품 판단에 쓰지 않는 기록 지표는 profile field, fixture, 편집기, 공개 검증 페이지, 공유 이미지, 문서의 지원 범위에서 제거한다.

### 결과와 안전장치

- API key는 기존과 같이 서버 환경변수와 `x-nxopen-api-key` 헤더에만 사용한다.
- 외부 응답은 Zod schema → normalized domain model → UI 순서로만 흐르며, 페이지가 NEXON JSON을 직접 읽지 않는다.
- API에 없는 값·누락 값은 `0`이나 추측으로 채우지 않는다.
- 보스 구분과 보스명·난이도는 `사용자 입력` 배지를 유지하고, 장비·전투력은 `API 조회` 배지를 유지한다.
- 장비 화면의 정보 구조는 공개된 참고 화면에서 현재 프리셋·장비 목록·심볼을 구분하는 방식을 검토하되, 외부 서비스의 코드·이미지·계산식·점수 체계는 가져오지 않는다. API 필드와 값의 기준은 NEXON 공식 문서만 사용한다.
- 외부 보스 아트는 사용자가 제공한 원본 사이트에 한정한다. 보스명·난이도·주기는 사용자 입력이며, 이 시각 자산이 NEXON의 공식 제휴·인증을 뜻하지 않는다.
