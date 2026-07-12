# NEXON Open API 매핑

최종 확인일: 2026-07-12  
공식 문서: [메이플스토리 API](https://openapi.nexon.com/ko/game/maplestory/), [API 사용 가이드](https://openapi.nexon.com/ko/guide/request-api/)

이 문서는 live provider가 사용할 **확인된 최소 계약**만 기록한다. 화면 컴포넌트는 이 응답을 직접 읽지 않고 `src/lib/nexon`의 schema/normalize adapter를 거친다. 문서가 변경되면 live provider와 이 문서를 같은 변경에서 갱신한다.

## 공통 규칙

- 기본 URL: `https://open.api.nexon.com`
- 메이플스토리 경로 접두사: `/maplestory/v1`
- 인증 헤더: `x-nxopen-api-key: <server-only API key>`
- 요청은 서버에서만 수행한다. 키를 브라우저, HTML, 오류 응답, 로그에 포함하지 않는다.
- 공식 문서는 수집 데이터의 30일 이내 갱신을 고지한다. 서비스는 24시간 이후 stale, 30일 이후 expired로 처리한다.
- 게임 데이터는 문서상 평균 15분 후 확인 가능하다. `fetchedAt`은 서비스가 응답을 받은 UTC 시각이고, `sourceDate`는 API가 반환/요청에 사용한 기준일이다.

## 핵심 호출 1: 캐릭터 식별자

```text
GET /maplestory/v1/id?character_name={URL-encoded character name}
```

| 구분 | 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| query | `character_name` | string | 예 | 조회할 캐릭터명 |
| response | `ocid` | string | 예 | 다음 호출에 사용할 캐릭터 식별자 |

정상 응답의 확인된 형태는 다음과 같다.

```json
{ "ocid": "string" }
```

`ocid`는 URL/공개 카드에 노출하지 않는다. `Character.ocid`에 고유값으로 저장하고, 캐릭터명은 표시/검색용 별도 값으로 보관한다. 게임 콘텐츠 변경으로 ocid가 변경될 수 있다는 공식 문서의 안내에 따라 갱신 시 이름으로 다시 resolve한다.

## 핵심 호출 2: 기본 정보

```text
GET /maplestory/v1/character/basic?ocid={ocid}&date={YYYY-MM-DD}
```

| 구분 | 이름 | 형식 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| query | `ocid` | string | 예 | `/id`에서 받은 캐릭터 식별자 |
| query | `date` | string (`YYYY-MM-DD`) | 아니오 | 과거 기준일 조회 시 사용 |

공식 `CharacterBasic` schema의 응답 필드는 아래와 같다.

| API 필드 | 형식 | normalized profile 매핑/처리 |
| --- | --- | --- |
| `date` | string | `sourceDate`로 보존 |
| `character_name` | string | `characterName` |
| `world_name` | string | `worldName` |
| `character_gender` | string | 현재 MVP 공개 카드에는 표시하지 않음 |
| `character_class` | string | `className` |
| `character_class_level` | string | 기본 정보 raw/상세 정보에서만 사용 |
| `character_level` | number | `level` |
| `character_exp` | number | 임의 환산 없이 raw/상세 정보에서만 사용 |
| `character_exp_rate` | string | 임의 환산 없이 raw/상세 정보에서만 사용 |
| `character_guild_name` | string | `currentGuild`; 값이 없으면 `0`이 아닌 조회 불가/섹션 숨김 |
| `character_image` | string | `imageUrl`; fetch 실패 시 자체 placeholder 렌더링 |
| `character_date_create` | string | raw/상세 정보 보존 |
| `access_flag` | string | 최근 7일 접속 여부; 현재 MVP 공개 카드에는 표시하지 않음 |
| `liberation_quest_clear` | string | raw/상세 정보 보존; 합격 판정이나 단일 점수에 사용하지 않음 |

adapter는 외부 응답을 Zod로 검증한다. 일시적으로 누락되거나 공개되지 않은 값은 `null`/`rawAvailability`로 표현하며, 정상 값처럼 추측하거나 `0`으로 바꾸지 않는다.

## 핵심 호출 3: 종합 능력치와 전투력

```text
GET /maplestory/v1/character/stat?ocid={ocid}&date={YYYY-MM-DD}
```

`/character/stat`은 live provider의 표준 조회 범위다. 기본 정보가 정상일 때 함께 조회하며, 응답을 Zod로 검증한 뒤 `final_stat`을 그대로 normalized profile의 `stats`에 보존한다.

| API 필드 | 형식 | normalized profile 매핑/처리 |
| --- | --- | --- |
| `date` | string | 응답 기준일 보존; 기본 정보 기준일과 다르면 상세 표시에서 구분 가능 |
| `character_class` | string | 직업명 교차 확인용; 기본 정보가 우선 |
| `final_stat[].stat_name` | string | API가 제공한 능력치 이름 그대로 `stats[].label` |
| `final_stat[].stat_value` | string 또는 number | API가 제공한 값 그대로 `stats[].value` |
| `final_stat` 중 이름이 `전투력`인 항목 | string 또는 number | `combatPower` 핵심 필드로만 복사; 계산·환산·등급화하지 않음 |
| `remain_ap` | string 또는 number | 현재 공개 카드의 핵심 수치로 추측하지 않으며, 필요 시 상세 정보에서만 사용 |

전투력은 이 endpoint의 `final_stat`에 실제로 포함된 원값일 때만 표시한다. 값이 없거나 endpoint가 실패하면 `0`이나 서비스 계산값으로 대체하지 않고 `조회 불가` 또는 섹션 숨김으로 처리한다.

## 핵심 호출 4: 현재 장착 전투 장비

```text
GET /maplestory/v1/character/item-equipment?ocid={ocid}&date={YYYY-MM-DD}
```

`/character/item-equipment`은 캐시 장비를 제외한 현재 장착 장비를 반환한다. live provider는 이 endpoint를 표준 조회 범위로 호출하고, 공개 검증 페이지에서 API 조회 장비임을 명확히 표시한다. 공유 PNG에는 정보 과밀을 피하기 위해 장비 전체 옵션을 넣지 않고, 요약된 핵심 지표만 표시한다.

| API 필드 | normalized profile 매핑/처리 |
| --- | --- |
| `preset_no` | `equipmentPresetNo`; API가 주는 경우에만 표시 |
| `item_equipment[].item_equipment_slot`, `item_equipment_part` | 장착 슬롯과 부위 |
| `item_name`, `item_icon`, `item_shape_name`, `item_shape_icon` | 아이템명과 API 제공 아이콘/외형 정보 |
| `item_total_option`, `item_base_option`, `item_add_option`, `item_exceptional_option`, `item_etc_option` | 옵션 이름·값을 보존해 상세 장비 패널에서 표시 |
| `starforce`, `scroll_upgrade` | 스타포스와 주문서 강화 횟수 원값 |
| `potential_option_grade`, `potential_option_1..3` | 잠재능력 등급과 옵션 원문 |
| `additional_potential_option_grade`, `additional_potential_option_1..3` | 에디셔널 잠재능력 등급과 옵션 원문 |
| `soul_name`, `soul_option` | API가 반환한 소울 정보 |

모든 장비 값은 API 원문을 정규화해 보여 주며, 서비스가 장비 점수·환산값·합격 판정을 계산하지 않는다. 캐릭터 이미지와 장비 아이콘은 API가 반환한 URL만 사용하고, 자체 UI 외 NEXON 브랜드 자산을 번들하지 않는다.

## 오류 코드

아래 표는 공식 API 사용 가이드의 현재 오류 코드 표를 그대로 서비스 오류 분류의 입력으로 사용한다.

| 오류 코드 | HTTP | 공식 설명 | 서비스 처리 |
| --- | --- | --- | --- |
| `OPENAPI00001` | 500 | 서버 내부 오류 | 짧은 jitter 재시도 후 일반 오류 |
| `OPENAPI00002` | 403 | 권한이 없는 경우 | live 설정/권한 오류로 기록, 키는 숨김 |
| `OPENAPI00003` | 400 | 유효하지 않은 식별자 | 캐릭터를 찾을 수 없음 |
| `OPENAPI00004` | 400 | 파라미터 누락 또는 유효하지 않음 | 작성 내용 검증 오류 |
| `OPENAPI00005` | 400 | 유효하지 않은 API KEY | 서버 설정 오류, 키는 숨김 |
| `OPENAPI00006` | 400 | 유효하지 않은 게임 또는 API PATH | 배포/adapter 설정 오류 |
| `OPENAPI00007` | 429 | API 호출량 초과 | rate-limit 안내 및 재시도 시간 적용 |
| `OPENAPI00009` | 400 | 데이터 준비 중 | 잠시 후 재시도 안내 |
| `OPENAPI00010` | 400 | 게임 점검 중 | 점검 안내 |
| `OPENAPI00011` | 503 | API 점검 중 | 점검 안내 |

네트워크 timeout, JSON schema 불일치, 예상하지 못한 HTTP 상태는 NEXON 코드가 아닌 별도 typed provider error로 처리한다. 선택 endpoint의 오류는 `basic` 호출이 정상일 때 전체 프로필 작성을 막지 않고 `rawAvailability`에 남긴다.

## 선택 보강 호출

아래 endpoint는 장비 검증 페이지를 풍부하게 하기 위한 선택 보강 호출이다. 기본/능력치/전투 장비 호출과 병렬로 요청할 수 있지만, 실패해도 기본 프로필 작성은 계속할 수 있다. 각 응답은 Zod로 검증하며, 실패·비공개·미지원은 `rawAvailability`와 부분 조회 안내에만 기록한다.

| endpoint | 용도 | 공개 처리 |
| --- | --- | --- |
| `/character/symbol-equipment` | 현재 장착 심볼의 이름, 아이콘, 레벨, 포스와 API 제공 능력치 | 장비 상세의 심볼 섹션 |
| `/character/cashitem-equipment` | 현재 장착 캐시 장비 | 전투 장비와 혼동되지 않도록 별도 꾸미기 섹션 |
| `/character/set-effect` | 적용 세트 효과와 세트 구성 수 | 장비 상세의 세트 효과 섹션 |

현재 구현 범위 밖의 공식 endpoint는 응답 구조를 추측해 표시하지 않는다. 새 endpoint를 추가할 때는 schema, normalized domain model, 이 문서를 같은 변경에서 갱신한다.

## 고지

공식 가이드는 서비스를 만들 때 `Data based on NEXON Open API` 문구를 표시하도록 안내한다. 이 문구와 비제휴 고지는 메력서 검증 페이지와 공유 이미지 모두에 포함한다.
