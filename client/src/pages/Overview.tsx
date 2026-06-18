import { trpc } from "@/lib/trpc";
import { useState, useCallback } from "react";
import { formatDelegatedTo, formatEswanAction, formatPriority, formatStatus } from "@/lib/labels";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  TrendingUp,
  Zap,
  CheckCircle,
  MessageSquare,
  PauseCircle,
  Calendar,
  XCircle,
  BookOpen,
  ListChecks,
  ArrowRight,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from "wouter";
import { toast } from "sonner";
import GoAheadModal from "@/components/gekko/GoAheadModal";
import RescheduleModal from "@/components/gekko/RescheduleModal";
import type { GaiTask } from "../../../server/gekkodb";

// ─── Stat Tile ────────────────────────────────────────────────────────────────

function StatTile({
  label,
  count,
  icon,
  filterKey,
  accentColor = "var(--gekko-green)",
  loading = false,
}: {
  label: string;
  count: number | null | undefined;
  icon: React.ReactNode;
  filterKey: string;
  accentColor?: string;
  loading?: boolean;
}) {
  const [, navigate] = useLocation();

  return (
    <button
      onClick={() => { navigate(`/tasks?filter=${filterKey}`); window.scrollTo({ top: 0, behavior: "smooth" }); }}
      className="flex flex-col gap-3 p-5 rounded-xl text-left transition-all duration-200 group"
      style={{
        backgroundColor: "var(--gekko-card)",
        border: "1px solid var(--gekko-border)",
        flex: "1 1 0",
        minWidth: "160px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--gekko-card-hover)";
        e.currentTarget.style.borderColor = accentColor;
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--gekko-card)";
        e.currentTarget.style.borderColor = "var(--gekko-border)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div className="flex items-center justify-between w-full">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.45)" }}>
          {label}
        </span>
        <span
          className="flex items-center justify-center w-7 h-7 rounded-lg"
          style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
        >
          {icon}
        </span>
      </div>
      <div className="text-4xl font-black text-white leading-none tracking-tight">
        {loading ? (
          <span className="inline-block w-12 h-9 rounded-lg animate-pulse" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
        ) : (
          count ?? 0
        )}
      </div>
    </button>
  );
}

// ─── Section Panel (always open) ─────────────────────────────────────────────

function SectionPanel({
  title,
  icon,
  children,
  badge,
  badgeColor,
  footer,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  badge?: number;
  badgeColor?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{ backgroundColor: "var(--gekko-card)", border: "1px solid var(--gekko-border)" }}
    >
      <div
        className="flex items-center gap-2.5 w-full px-5 py-4"
        style={{ borderBottom: "1px solid var(--gekko-border)" }}
      >
        {icon && <span style={{ color: "var(--gekko-green)" }}>{icon}</span>}
        <span className="font-black text-white text-sm flex-1 tracking-wide">{title}</span>
        {badge !== undefined && badge > 0 && (
          <span
            className="flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-bold"
            style={{ backgroundColor: badgeColor ?? "var(--gekko-green)", color: "#000" }}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      <div className="p-4 flex-1">{children}</div>
      {footer && (
        <div className="px-4 pb-3" style={{ borderTop: "1px solid var(--gekko-border)" }}>
          {footer}
        </div>
      )}
    </div>
  );
}

// ─── Action Task Row ──────────────────────────────────────────────────────────

function ActionTaskRow({ task, onRefresh }: { task: GaiTask; onRefresh: () => void }) {
  const [goAheadOpen, setGoAheadOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const utils = trpc.useUtils();

  const updateAction = trpc.tasks.updateAction.useMutation({
    onSuccess: () => {
      utils.tasks.getAll.invalidate();
      utils.tasks.getStats.invalidate();
      onRefresh();
    },
    onError: (err) => toast.error(`Action failed: ${err.message}`),
  });

  const addReply = trpc.tasks.addReply.useMutation({
    onError: (err) => toast.error(`Reply failed: ${err.message}`),
  });

  const handleGoAhead = (notes: string) => {
    updateAction.mutate(
      { id: task.id, eswan_action: "go_ahead", eswan_notes: notes || undefined },
      { onSuccess: () => { toast.success("Go Ahead sent"); setGoAheadOpen(false); } }
    );
  };

  const handleReply = (message: string) => {
    if (!message.trim()) { toast.error("Reply cannot be empty"); return; }
    addReply.mutate(
      { task_id: task.id, message: message.trim() },
      { onSuccess: () => { toast.success("Reply logged"); setReplyOpen(false); } }
    );
  };

  const handleHold = () => {
    updateAction.mutate(
      { id: task.id, eswan_action: "hold" },
      { onSuccess: () => toast.success("Task on hold") }
    );
  };

  const handleReschedule = (datetime: string) => {
    updateAction.mutate(
      { id: task.id, eswan_action: "reschedule", rescheduled_to: datetime },
      { onSuccess: () => { toast.success("Task rescheduled"); setRescheduleOpen(false); } }
    );
  };

  const handleCancel = () => {
    if (!window.confirm(`Cancel "${task.name}"?`)) return;
    updateAction.mutate(
      { id: task.id, eswan_action: "cancel" },
      { onSuccess: () => toast.success("Task cancelled") }
    );
  };

  const isLoading = updateAction.isPending || addReply.isPending;

  // Status colour
  const statusColor: Record<string, string> = {
    pending: "#fbbf24",
    in_progress: "#60a5fa",
    done: "#00ff41",
    cancelled: "#6b7280",
    blocked: "#f87171",
  };
  const priorityColor: Record<string, string> = {
    urgent: "#f87171",
    high: "#fb923c",
    normal: "#60a5fa",
    low: "#6b7280",
  };

  const sc = statusColor[task.status] ?? "#fff";
  const pc = priorityColor[task.priority ?? "normal"] ?? "#60a5fa";

  return (
    <>
      <div
        className="rounded-lg px-4 py-3 transition-colors duration-150"
        style={{
          backgroundColor: "rgba(255,255,255,0.025)",
          border: "1px solid var(--gekko-border)",
          marginBottom: "6px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.045)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.025)")}
      >
        {/* Row 1: Name + external link + badges */}
        <div className="flex items-start gap-2 mb-2.5">
          <div className="flex-1 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm font-bold text-white leading-snug line-clamp-2 cursor-default block">
                  {task.name}
                </span>
              </TooltipTrigger>
              <TooltipContent
                style={{ backgroundColor: "#1e1e24", border: "1px solid rgba(255,255,255,0.12)", color: "white", maxWidth: "320px" }}
              >
                {task.name}
              </TooltipContent>
            </Tooltip>
          </div>
          {task.manus_task_id && (
            <a
              href={`https://manus.im/app/${task.manus_task_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 mt-0.5 transition-opacity duration-150 hover:opacity-100 opacity-60"
              style={{ color: "var(--gekko-green)" }}
              title="Open in Manus"
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>

        {/* Row 2: Badges + delegated_to */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {/* Priority badge */}
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${pc}18`, color: pc, border: `1px solid ${pc}40` }}
          >
            {formatPriority(task.priority)}
          </span>
          {/* Status badge */}
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${sc}18`, color: sc, border: `1px solid ${sc}40` }}
          >
            {formatStatus(task.status)}
          </span>
          {/* Delegated to */}
          {task.delegated_to && (
            <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
              → {formatDelegatedTo(task.delegated_to)}
            </span>
          )}
        </div>

        {/* Row 3: Action buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto" style={{ flexWrap: "nowrap", scrollbarWidth: "none" }}>
          <button
            onClick={() => setGoAheadOpen(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all duration-150 disabled:opacity-50 whitespace-nowrap shrink-0"
            style={{ backgroundColor: "rgba(0,255,65,0.12)", color: "var(--gekko-green)", border: "1px solid rgba(0,255,65,0.25)" }}
          >
            <CheckCircle size={12} />
            Go Ahead
          </button>
          <button
            onClick={() => setReplyOpen(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all duration-150 disabled:opacity-50 whitespace-nowrap shrink-0"
            style={{ backgroundColor: "rgba(96,165,250,0.1)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.25)" }}
          >
            <MessageSquare size={12} />
            Reply
          </button>
          <button
            onClick={handleHold}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all duration-150 disabled:opacity-50 whitespace-nowrap shrink-0"
            style={{ backgroundColor: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}
          >
            <PauseCircle size={12} />
            Hold
          </button>
          <button
            onClick={() => setRescheduleOpen(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all duration-150 disabled:opacity-50 whitespace-nowrap shrink-0"
            style={{ backgroundColor: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)" }}
          >
            <Calendar size={12} />
            Reschedule
          </button>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all duration-150 disabled:opacity-50 whitespace-nowrap shrink-0"
            style={{ backgroundColor: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)" }}
          >
            <XCircle size={12} />
            Cancel
          </button>
        </div>
      </div>

      <GoAheadModal
        open={goAheadOpen}
        onClose={() => setGoAheadOpen(false)}
        onConfirm={handleGoAhead}
        taskName={task.name}
        mode="go_ahead"
        loading={isLoading}
      />
      <GoAheadModal
        open={replyOpen}
        onClose={() => setReplyOpen(false)}
        onConfirm={handleReply}
        taskName={task.name}
        mode="reply"
        loading={isLoading}
      />
      <RescheduleModal
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        onConfirm={handleReschedule}
        taskName={task.name}
        loading={isLoading}
      />
    </>
  );
}

// ─── Overview Page ────────────────────────────────────────────────────────────

export default function Overview() {
  const [, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();

  const { data: stats, isLoading: statsLoading } = trpc.tasks.getStats.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const { data: actionTasks, isLoading: tasksLoading } = trpc.tasks.getAll.useQuery(
    { filter: "awaiting" },
    { refetchOnWindowFocus: false }
  );

  const [today] = useState(() => new Date().toISOString().substring(0, 10));
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
    setTimeout(() => setIsRefreshing(false), 800);
  }, [utils]);

  const dateLabel = new Date().toLocaleDateString("en-ZA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: "'Nunito', sans-serif" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5 tracking-tight">
            <Zap size={22} style={{ color: "var(--gekko-green)" }} />
            Command Centre
          </h1>
          <p className="text-sm mt-1 font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
            {dateLabel}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-150 active:scale-95"
          style={{
            backgroundColor: "var(--gekko-card)",
            border: "1px solid var(--gekko-border)",
            color: "rgba(255,255,255,0.8)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--gekko-green)";
            e.currentTarget.style.color = "var(--gekko-green)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--gekko-border)";
            e.currentTarget.style.color = "rgba(255,255,255,0.8)";
          }}
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} style={{ color: "inherit" }} />
          Refresh
        </button>
      </div>

      {/* ── Stat Tiles ──────────────────────────────────────────────────── */}
      <div className="flex gap-3 flex-wrap">
        <StatTile
          label="Awaiting Action"
          count={stats?.awaiting}
          icon={<AlertCircle size={15} />}
          filterKey="awaiting"
          accentColor="#fbbf24"
          loading={statsLoading}
        />
        <StatTile
          label="Urgent"
          count={stats?.urgent}
          icon={<TrendingUp size={15} />}
          filterKey="urgent"
          accentColor="#f87171"
          loading={statsLoading}
        />
        <StatTile
          label="In Progress"
          count={stats?.in_progress}
          icon={<Clock size={15} />}
          filterKey="in_progress"
          accentColor="#60a5fa"
          loading={statsLoading}
        />
        <StatTile
          label="Done Today"
          count={stats?.done_today}
          icon={<CheckCircle2 size={15} />}
          filterKey="done_today"
          accentColor="var(--gekko-green)"
          loading={statsLoading}
        />
      </div>

      {/* ── Two-column layout ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

        {/* LEFT: Gai Daily Brief */}
        <SectionPanel
          title="Gai Daily Brief"
          icon={<BookOpen size={15} />}
          badge={brief?.summary.errors}
          badgeColor="#f87171"
        >
          {briefLoading ? (
            <div className="flex items-center gap-2 text-sm py-4" style={{ color: "rgba(255,255,255,0.5)" }}>
              <Loader2 size={14} className="animate-spin" />
              Loading brief...
            </div>
          ) : brief ? (
            <div className="space-y-4">

              {/* Summary stat mini-tiles */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Cycles Run", value: brief.summary.cycles_run, color: "var(--gekko-green)" },
                  { label: "Delegated", value: brief.summary.tasks_delegated, color: "#60a5fa" },
                  { label: "Completed", value: brief.summary.tasks_completed, color: "var(--gekko-green)" },
                  { label: "Errors", value: brief.summary.errors, color: brief.summary.errors > 0 ? "#f87171" : "rgba(255,255,255,0.4)" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid var(--gekko-border)" }}
                  >
                    <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>{s.label}</span>
                    <span className="text-lg font-black" style={{ color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Gmail highlights */}
              {brief.gmail_highlights.length > 0 && (
                <div>
                  <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Gmail Highlights
                  </div>
                  <div className="space-y-1.5">
                    {brief.gmail_highlights.slice(0, 5).map((g: { from: string; subject: string }, i: number) => (
                      <div
                        key={i}
                        className="px-3 py-2.5 rounded-lg"
                        style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid var(--gekko-border)" }}
                      >
                        <div className="text-sm font-semibold text-white truncate">{g.subject}</div>
                        <div className="text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{g.from}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Eswan's actions today */}
              {brief.eswan_actions_today.length > 0 && (
                <div>
                  <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Eswan's Actions Today
                  </div>
                  <div className="space-y-1">
                    {brief.eswan_actions_today.slice(0, 8).map((t: { id: string; name: string; eswan_action: string | null }) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg"
                        style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid var(--gekko-border)" }}
                      >
                        <span className="text-sm text-white truncate flex-1 font-medium">{t.name}</span>
                        <span
                          className="text-xs font-bold shrink-0 px-2 py-0.5 rounded-full"
                          style={{
                            color: t.eswan_action === "cancel" ? "#f87171" : t.eswan_action === "go_ahead" ? "var(--gekko-green)" : "#fbbf24",
                            backgroundColor: t.eswan_action === "cancel" ? "rgba(248,113,113,0.12)" : t.eswan_action === "go_ahead" ? "rgba(0,255,65,0.12)" : "rgba(251,191,36,0.12)",
                          }}
                        >
                          {formatEswanAction(t.eswan_action)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {brief.summary.cycles_run === 0 && brief.gmail_highlights.length === 0 && brief.eswan_actions_today.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8">
                  <Clock size={28} style={{ color: "rgba(255,255,255,0.2)" }} />
                  <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>
                    No activity recorded yet today.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8">
              <Clock size={28} style={{ color: "rgba(255,255,255,0.2)" }} />
              <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>
                No brief available for today.
              </p>
            </div>
          )}
        </SectionPanel>

        {/* RIGHT: Action Required */}
        <SectionPanel
          title="Action Required"
          icon={<ListChecks size={15} />}
          badge={actionTasks?.length}
          badgeColor="#fbbf24"
          footer={
            actionTasks && actionTasks.length > 0 ? (
              <button
                onClick={() => { navigate("/tasks?filter=awaiting"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="flex items-center gap-1.5 mt-3 text-xs font-bold transition-colors duration-150"
                style={{ color: "rgba(255,255,255,0.45)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gekko-green)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
              >
                View all {actionTasks.length} tasks in Task Dashboard
                <ArrowRight size={12} />
              </button>
            ) : undefined
          }
        >
          {tasksLoading ? (
            <div className="flex items-center gap-2 text-sm py-4" style={{ color: "rgba(255,255,255,0.5)" }}>
              <Loader2 size={14} className="animate-spin" />
              Loading tasks...
            </div>
          ) : actionTasks && actionTasks.length > 0 ? (
            <div>
              {actionTasks.map((task) => (
                <ActionTaskRow key={task.id} task={task} onRefresh={handleRefresh} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10">
              <CheckCircle2 size={36} style={{ color: "var(--gekko-green)" }} />
              <div className="text-center">
                <p className="text-sm font-bold text-white">All clear</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Nothing awaiting your action.</p>
              </div>
            </div>
          )}
        </SectionPanel>
      </div>
    </div>
  );
}
