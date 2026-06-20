import { type FC } from "react";

export type Tier = "all" | "T2" | "T3" | "T4" | "T5";

interface TierOption {
  value: Tier;
  label: string;
}

const TIER_OPTIONS: TierOption[] = [
  { value: "all", label: "All" },
  { value: "T2", label: "T2 Distributor" },
  { value: "T3", label: "T3 Partner" },
  { value: "T4", label: "T4 Agency" },
  { value: "T5", label: "T5 Client" },
];

interface TierFilterProps {
  value: Tier;
  onChange: (tier: Tier) => void;
  className?: string;
}

const TierFilter: FC<TierFilterProps> = ({ value, onChange, className = "" }) => {
  return (
    <div
      className={`flex items-center gap-1 flex-wrap ${className}`}
      role="group"
      aria-label="Filter by tier"
    >
      {TIER_OPTIONS.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 whitespace-nowrap"
            style={{
              backgroundColor: isActive
                ? "#F59E0B"
                : "rgba(255,255,255,0.06)",
              color: isActive ? "#000" : "rgba(255,255,255,0.75)",
              border: isActive
                ? "1px solid #F59E0B"
                : "1px solid rgba(255,255,255,0.1)",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = "rgba(245,158,11,0.15)";
                e.currentTarget.style.color = "#F59E0B";
                e.currentTarget.style.borderColor = "rgba(245,158,11,0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
                e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              }
            }}
            aria-pressed={isActive}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export default TierFilter;
