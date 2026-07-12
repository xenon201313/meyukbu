import { getFreshnessStatus, freshnessLabels, type FreshnessStatus } from "@/domain/freshness";

const freshnessClassNames: Record<FreshnessStatus, string> = {
  fresh: "border-emerald-800/35 bg-emerald-100 text-emerald-950",
  stale: "border-amber-800/35 bg-amber-100 text-amber-950",
  expired: "border-rose-800/35 bg-rose-100 text-rose-950",
};

interface FreshnessBadgeProps {
  fetchedAt: string;
  status?: FreshnessStatus;
  className?: string;
}

/** Shows the age policy result for an API snapshot. */
export function FreshnessBadge({
  fetchedAt,
  status = getFreshnessStatus(fetchedAt),
  className = "",
}: FreshnessBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[0.7rem] font-bold tracking-[0.04em] whitespace-nowrap ${freshnessClassNames[status]} ${className}`}
      data-freshness={status}
    >
      {freshnessLabels[status]}
    </span>
  );
}
