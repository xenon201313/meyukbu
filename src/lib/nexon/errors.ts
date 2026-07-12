export type NexonErrorCode =
  | "OPENAPI00001"
  | "OPENAPI00002"
  | "OPENAPI00003"
  | "OPENAPI00004"
  | "OPENAPI00005"
  | "OPENAPI00006"
  | "OPENAPI00007"
  | "OPENAPI00009"
  | "OPENAPI00010"
  | "OPENAPI00011"
  | "NOT_FOUND"
  | "INVALID_RESPONSE"
  | "NETWORK";

export class NexonProviderError extends Error {
  constructor(
    readonly code: NexonErrorCode,
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "NexonProviderError";
  }
}

export const nexonErrorMessages: Record<NexonErrorCode, string> = {
  OPENAPI00001: "게임 데이터 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  OPENAPI00002: "게임 데이터 조회 권한을 확인할 수 없습니다.",
  OPENAPI00003: "해당 캐릭터를 찾지 못했습니다. 이름을 다시 확인해 주세요.",
  OPENAPI00004: "조회 요청 형식이 올바르지 않습니다.",
  OPENAPI00005: "게임 데이터 조회 설정을 확인해 주세요.",
  OPENAPI00006: "현재 지원하지 않는 게임 데이터 요청입니다.",
  OPENAPI00007: "조회 요청이 많습니다. 잠시 후 다시 시도해 주세요.",
  OPENAPI00009: "게임 데이터가 준비 중입니다. 잠시 후 다시 시도해 주세요.",
  OPENAPI00010: "현재 게임 데이터 조회가 원활하지 않습니다. 잠시 후 다시 시도해 주세요.",
  OPENAPI00011: "현재 게임 데이터 조회가 점검 중입니다. 잠시 후 다시 시도해 주세요.",
  NOT_FOUND: "해당 캐릭터를 찾지 못했습니다. 이름을 다시 확인해 주세요.",
  INVALID_RESPONSE: "게임 데이터 응답 형식을 확인하지 못했습니다.",
  NETWORK: "게임 데이터에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

export function userFacingNexonError(error: unknown): string {
  if (error instanceof NexonProviderError) {
    return nexonErrorMessages[error.code];
  }
  return nexonErrorMessages.NETWORK;
}
