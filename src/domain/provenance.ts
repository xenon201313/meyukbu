export const dataProvenanceValues = [
  "NEXON_API",
  "SERVICE_CALCULATED",
  "USER_PROVIDED",
  "SERVICE_OBSERVED",
] as const;

export type DataProvenance = (typeof dataProvenanceValues)[number];

export const provenanceLabels: Record<DataProvenance, string> = {
  NEXON_API: "API 조회",
  SERVICE_CALCULATED: "서비스 계산",
  USER_PROVIDED: "작성 내용",
  SERVICE_OBSERVED: "서비스 관측",
};
