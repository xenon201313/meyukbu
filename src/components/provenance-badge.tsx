import type { DataProvenance } from "@/domain/provenance";
import { provenanceLabels } from "@/domain/provenance";

const provenanceClassNames: Record<DataProvenance, string> = {
  NEXON_API: "border-cyan-300/45 bg-cyan-300/10 text-cyan-100",
  SERVICE_CALCULATED: "border-violet-300/45 bg-violet-300/10 text-violet-100",
  USER_PROVIDED: "border-amber-300/45 bg-amber-300/10 text-amber-100",
  SERVICE_OBSERVED: "border-emerald-300/45 bg-emerald-300/10 text-emerald-100",
};

interface ProvenanceBadgeProps {
  provenance: DataProvenance;
  className?: string;
}

/** Displays the origin of a value without implying official certification. */
export function ProvenanceBadge({ provenance, className = "" }: ProvenanceBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${provenanceClassNames[provenance]} ${className}`}
      data-provenance={provenance}
    >
      {provenanceLabels[provenance]}
    </span>
  );
}
