import { getFreshnessStatus, freshnessLabels, type FreshnessStatus } from "@/domain/freshness";

const freshnessClassNames: Record<FreshnessStatus, string> = {
  fresh: "border-emerald-200 bg-emerald-50 text-emerald-800",
  stale: "border-amber-200 bg-amber-50 text-amber-900",
  expired: "border-rose-200 bg-rose-50 text-rose-800",
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
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${freshnessClassNames[status]} ${className}`}
      data-freshness={status}
    >
      {freshnessLabels[status]}
    </span>
  );
}
