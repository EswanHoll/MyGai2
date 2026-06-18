import { trpc } from "@/lib/trpc";
import { useState, useCallback } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  TrendingUp,
  Zap,
} from "lucide-react";
import StatTile from "@/components/gekko/StatTile";
import TaskActionGroup from "@/components/gekko/TaskActionGroup";
import { StatusBadge, PriorityBadge } from "@/components/gekko/Badges";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCollapsible } from "@/hooks/useCollapsible";

// ─── Collapsible Section ─────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  storageKey,
  children,
  badge,
}: {
  title: string;
  storageKey: string;
  children: React.ReactNode;
  badge?: number;
}) {
  const [open, setOpen] = useCollapsible(storageKey, true);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: "var(--gekko-card)", border: "1px solid var(--gekko-border)" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-4 py-3 text-left transition-colors duration-150"
        style={{ borderBottom: open ? "1px solid var(--gekko-border)" : "none" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        {/* Chevron on LEFT */}
        <span
          className="transition-transform duration-200 shrink-0"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", color: "rgba(255,255,255,0.5)" }}
        >
          ▶
        </span>
        <span className="font-bold text-white text-sm flex-1">{title}</span>
        {badge !== undefined && badge > 0 && (
          <span
            className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
            style={{ backgroundColor: "var(--gekko-green)", color: "#000" }}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

import type { GaiTask } from "../../../server/gekkodb";

// ─── Task Row ─────────────────────────────────────────────────────────────────

function ActionTaskRow({ task }: { task: GaiTask }) {
  return (
    <div
      className="flex items-center gap-3 py-2.5 px-3 rounded-md transition-colors duration-150"
      style={{ borderBottom: "1px solid var(--gekko-border)" }}
    >
      {/* Task name with tooltip */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-sm font-semibold text-white truncate max-w-[180px] cursor-default">
              {task.name}
            </span>
          </TooltipTrigger>
          <TooltipContent
            style={{ backgroundColor: "var(--gekko-card)", border: "1px solid var(--gekko-border)", color: "white" }}
          >
            {task.name}
          </TooltipContent>
        </Tooltip>
        {task.manus_task_id && (
          <a
            href={`https://manus.im/app/${task.manus_task_id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--gekko-green)" }}
            title="Open in Manus"
          >
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
      </div>

      {/* Delegated to */}
      {task.delegated_to && (
        <span className="text-xs shrink-0 hidden lg:block" style={{ color: "rgba(255,255,255,0.5)" }}>
          {task.delegated_to}
        </span>
      )}

      {/* Actions */}
      <div className="shrink-0">
        <TaskActionGroup task={task} compact />
      </div>
    </div>
  );
}

// ─── Overview Page ────────────────────────────────────────────────────────────

export default function Overview() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const utils = trpc.useUtils();

  const { data: stats, isLoading: statsLoading } = trpc.tasks.getStats.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const { data: actionTasks, isLoading: tasksLoading } = trpc.tasks.getAll.useQuery(
    { filter: "awaiting" },
    { refetchOnWindowFocus: false }
  );

  const today = new Date().toISOString().substring(0, 10);
  const { data: brief, isLoading: briefLoading } = trpc.brief.getByDate.useQuery(
    { date: today },
    { refetchOnWindowFocus: false }
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      utils.tasks.getStats.invalidate(),
      utils.tasks.getAll.invalidate(),
      utils.brief.getByDate.invalidate(),
    ]);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsRefreshing(false), 600);
  }, [utils]);

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap size={22} style={{ color: "var(--gekko-green)" }} />
            Command Centre
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
            {new Date().toLocaleDateString("en-ZA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-all duration-150"
          style={{
            backgroundColor: "var(--gekko-card)",
            border: "1px solid var(--gekko-border)",
            color: "rgba(255,255,255,0.8)",
          }}
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Stat Tiles ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <StatTile
          label="Awaiting Action"
          count={stats?.awaiting}
          icon={<AlertCircle size={16} />}
          filterKey="awaiting"
          accentColor="#fbbf24"
          loading={statsLoading}
        />
        <StatTile
          label="Urgent"
          count={stats?.urgent}
          icon={<TrendingUp size={16} />}
          filterKey="urgent"
          accentColor="#f87171"
          loading={statsLoading}
        />
        <StatTile
          label="In Progress"
          count={stats?.in_progress}
          icon={<Clock size={16} />}
          filterKey="in_progress"
          accentColor="#60a5fa"
          loading={statsLoading}
        />
        <StatTile
          label="Done Today"
          count={stats?.done_today}
          icon={<CheckCircle2 size={16} />}
          filterKey="done_today"
          accentColor="var(--gekko-green)"
          loading={statsLoading}
        />
      </div>

      {/* ── Two-column layout ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Gai Daily Brief */}
        <CollapsibleSection
          title="Gai Daily Brief"
          storageKey="gekko_brief_open"
          badge={brief?.summary.errors}
        >
          {briefLoading ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              <Loader2 size={14} className="animate-spin" />
              Loading brief...
            </div>
          ) : brief ? (
            <div className="space-y-3">
              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Cycles Run", value: brief.summary.cycles_run },
                  { label: "Delegated", value: brief.summary.tasks_delegated },
                  { label: "Completed", value: brief.summary.tasks_completed },
                  { label: "Errors", value: brief.summary.errors },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center justify-between px-3 py-2 rounded"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid var(--gekko-border)" }}
                  >
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{s.label}</span>
                    <span className="text-sm font-bold text-white">{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Gmail highlights */}
              {brief.gmail_highlights.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                    Gmail Highlights
                  </div>
                  <div className="space-y-1">
                    {brief.gmail_highlights.slice(0, 5).map((g: { from: string; subject: string }, i: number) => (
                      <div
                        key={i}
                        className="px-3 py-2 rounded text-xs"
                        style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid var(--gekko-border)" }}
                      >
                        <div className="font-semibold text-white truncate">{g.subject}</div>
                        <div style={{ color: "rgba(255,255,255,0.5)" }}>{g.from}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* In-progress tasks */}
              {brief.eswan_actions_today.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                    Eswan's Actions Today
                  </div>
                  <div className="space-y-1">
                    {brief.eswan_actions_today.slice(0, 5).map((t: { id: string; name: string; eswan_action: string | null }) => (
                      <div key={t.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded"
                        style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                        <span className="text-white truncate flex-1">{t.name}</span>
                        <span style={{ color: "var(--gekko-green)" }}>{t.eswan_action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {brief.summary.cycles_run === 0 && brief.gmail_highlights.length === 0 && brief.eswan_actions_today.length === 0 && (
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  No activity recorded yet today.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              No brief available for today.
            </p>
          )}
        </CollapsibleSection>

        {/* RIGHT: Action Required */}
        <CollapsibleSection
          title="Action Required"
          storageKey="gekko_action_open"
          badge={actionTasks?.length}
        >
          {tasksLoading ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              <Loader2 size={14} className="animate-spin" />
              Loading tasks...
            </div>
          ) : actionTasks && actionTasks.length > 0 ? (
            <div className="space-y-1">
              {actionTasks.map((task) => (
                <ActionTaskRow key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6">
              <CheckCircle2 size={32} style={{ color: "var(--gekko-green)" }} />
              <p className="text-sm font-semibold text-white">All clear — nothing awaiting your action.</p>
            </div>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}
