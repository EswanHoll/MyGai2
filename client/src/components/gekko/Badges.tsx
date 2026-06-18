import type { TaskStatus, TaskPriority } from "../../../../server/gekkodb";

const STATUS_CONFIG: Record<TaskStatus, { label: string; bg: string; color: string }> = {
  pending:     { label: "Pending",     bg: "rgba(202,138,4,0.2)",   color: "#fbbf24" },
  in_progress: { label: "In Progress", bg: "rgba(37,99,235,0.2)",   color: "#60a5fa" },
  done:        { label: "Done",        bg: "rgba(22,163,74,0.2)",   color: "#4ade80" },
  cancelled:   { label: "Cancelled",   bg: "rgba(100,116,139,0.2)", color: "#94a3b8" },
  blocked:     { label: "Blocked",     bg: "rgba(220,38,38,0.2)",   color: "#f87171" },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; bg: string; color: string }> = {
  urgent: { label: "Urgent", bg: "rgba(220,38,38,0.2)",   color: "#f87171" },
  high:   { label: "High",   bg: "rgba(234,88,12,0.2)",   color: "#fb923c" },
  normal: { label: "Normal", bg: "rgba(37,99,235,0.2)",   color: "#60a5fa" },
  low:    { label: "Low",    bg: "rgba(100,116,139,0.2)", color: "#94a3b8" },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.normal;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}
