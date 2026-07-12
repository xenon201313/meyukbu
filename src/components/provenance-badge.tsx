import type { DataProvenance } from "@/domain/provenance";
import { provenanceLabels } from "@/domain/provenance";

const provenanceClassNames: Record<DataProvenance, string> = {
  NEXON_API: "border-sky-700/35 bg-sky-100 text-sky-950",
  SERVICE_CALCULATED: "border-violet-700/35 bg-violet-100 text-violet-950",
  USER_PROVIDED: "border-amber-800/35 bg-amber-100 text-amber-950",
  SERVICE_OBSERVED: "border-emerald-800/35 bg-emerald-100 text-emerald-950",
};

interface ProvenanceBadgeProps {
  provenance: DataProvenance;
  className?: string;
}

/** Displays the origin of a value without implying official certification. */
export function ProvenanceBadge({ provenance, className = "" }: ProvenanceBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[0.7rem] font-bold tracking-[0.04em] whitespace-nowrap ${provenanceClassNames[provenance]} ${className}`}
      data-provenance={provenance}
    >
      {provenanceLabels[provenance]}
    </span>
  );
}
