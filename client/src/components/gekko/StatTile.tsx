import { useLocation } from "wouter";
import type { ReactNode } from "react";

interface StatTileProps {
  label: string;
  count: number | null | undefined;
  icon: ReactNode;
  filterKey: "awaiting" | "urgent" | "in_progress" | "done_today";
  accentColor?: string;
  loading?: boolean;
}

export default function StatTile({ label, count, icon, filterKey, accentColor = "var(--gekko-green)", loading = false }: StatTileProps) {
  const [, navigate] = useLocation();

  const handleClick = () => {
    navigate(`/tasks?filter=${filterKey}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={handleClick}
      className="flex flex-col gap-2 p-4 rounded-lg text-left transition-all duration-200 group min-w-0"
      style={{
        backgroundColor: "var(--gekko-card)",
        border: "1px solid var(--gekko-border)",
        cursor: "pointer",
        flex: "1 1 140px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--gekko-card-hover)";
        e.currentTarget.style.borderColor = accentColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--gekko-card)";
        e.currentTarget.style.borderColor = "var(--gekko-border)";
      }}
    >
      <div className="flex items-center justify-between w-full">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.55)" }}>
          {label}
        </span>
        <span style={{ color: accentColor }}>{icon}</span>
      </div>
      <div className="text-3xl font-bold text-white leading-none">
        {loading ? (
          <span className="inline-block w-8 h-7 rounded animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
        ) : (
          count ?? 0
        )}
      </div>
    </button>
  );
}
