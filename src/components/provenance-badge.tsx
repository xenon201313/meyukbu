import type { DataProvenance } from "@/domain/provenance";
import { provenanceLabels } from "@/domain/provenance";

const provenanceClassNames: Record<DataProvenance, string> = {
  NEXON_API: "border-sky-200 bg-sky-50 text-sky-800",
  SERVICE_CALCULATED: "border-violet-200 bg-violet-50 text-violet-800",
  USER_PROVIDED: "border-amber-200 bg-amber-50 text-amber-900",
  SERVICE_OBSERVED: "border-emerald-200 bg-emerald-50 text-emerald-800",
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
