import { getFreshnessStatus, freshnessLabels, type FreshnessStatus } from "@/domain/freshness";

const freshnessClassNames: Record<FreshnessStatus, string> = {
  fresh: "border-emerald-300/45 bg-emerald-300/10 text-emerald-100",
  stale: "border-amber-300/45 bg-amber-300/10 text-amber-100",
  expired: "border-rose-300/45 bg-rose-300/10 text-rose-100",
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
