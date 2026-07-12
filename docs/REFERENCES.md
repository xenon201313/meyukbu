# 공식 참고 문서

구현 시 최신 내용을 다시 확인한다.

- Codex AGENTS.md: https://developers.openai.com/codex/guides/agents-md
- Codex overview: https://developers.openai.com/codex
- NEXON Open API: https://openapi.nexon.com/
- NEXON API usage guide: https://openapi.nexon.com/guide/request-api/
- MapleStory Open API: https://openapi.nexon.com/game/maplestory/
- User-authorized boss artwork source: https://maple-trackers.com/

NEXON 가이드에 따라 API key는 `x-nxopen-api-key` header로 서버에서 전송하고, 서비스에는 “Data based on NEXON Open API” 고지를 표시한다. 실제 endpoint와 schema는 구현 시 공식 게임 문서에서 확인한다.

보스 아트는 Open API 응답이 아니다. 이 저장소에서는 사용자가 해당 사이트 운영자로서 허가한 Maple Trackers 원본만 서버 어댑터로 참조하고, 이미지 파일을 저장소에 복제하지 않는다.
