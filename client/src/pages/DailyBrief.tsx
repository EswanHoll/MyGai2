import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  XCircle,
  Mail,
  Activity,
  ChevronDown as ExpandIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/gekko/Badges";
import { formatDelegatedTo, formatEswanAction, formatDateTab } from "@/lib/labels";

// ─── Collapsible Section ─────────────────────────────────────────────────────

function Section({
  title,
  icon,
  defaultOpen = true,
  children,
  count,
  accentColor,
}: {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  count?: number;
  accentColor?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: "var(--gekko-card)", border: "1px solid var(--gekko-border)" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 w-full px-5 py-4 text-left transition-colors duration-150"
        style={{
          borderBottom: open ? "1px solid var(--gekko-border)" : "none",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        {icon && (
          <span style={{ color: accentColor ?? "var(--gekko-green)", flexShrink: 0 }}>
            {icon}
          </span>
        )}
        <span className="font-black text-white text-sm flex-1 tracking-wide">{title}</span>
        {count !== undefined && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-bold mr-2"
            style={{
              backgroundColor: count > 0 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
              color: count > 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)",
            }}
          >
            {count}
          </span>
        )}
        <span style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function Empty({ message }: { message: string }) {
  return (
    <p className="text-sm py-1" style={{ color: "rgba(255,255,255,0.5)" }}>
      {message}
    </p>
  );
}

// ─── Log Row ─────────────────────────────────────────────────────────────────

function LogRow({
  log,
}: {
  log: {
    id: string;
    action_type: string | null;
    status: string | null;
    message: string | null;
    created_at: string;
  };
}) {
  return (
    <div
      className="flex items-start gap-3 py-2.5 text-sm"
      style={{ borderBottom: "1px solid var(--gekko-border)" }}
    >
      <span className="text-xs shrink-0 mt-0.5 font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
        {new Date(log.created_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
      </span>
      <span
        className="text-xs px-2 py-0.5 rounded shrink-0 font-bold"
        style={{
          backgroundColor:
            log.status === "error" ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.07)",
          color: log.status === "error" ? "#f87171" : "rgba(255,255,255,0.65)",
        }}
      >
        {log.action_type ?? "log"}
      </span>
      <span className="text-white text-xs leading-relaxed">{log.message ?? "—"}</span>
    </div>
  );
}

// ─── Daily Brief Page ─────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function DailyBrief() {
  const today = useMemo(() => new Date().toISOString().substring(0, 10), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [actionsExpanded, setActionsExpanded] = useState(false);

  const { data: availableDates } = trpc.brief.availableDates.useQuery();
  const { data: brief, isLoading, refetch } = trpc.brief.getByDate.useQuery(
    { date: selectedDate },
    { refetchOnWindowFocus: false }
  );

  const utils = trpc.useUtils();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await utils.brief.getByDate.invalidate();
    await refetch();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const displayedActions = brief
    ? actionsExpanded
      ? brief.eswan_actions_today
      : brief.eswan_actions_today.slice(0, PAGE_SIZE)
    : [];

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5 tracking-tight">
            <BookOpen size={22} style={{ color: "var(--gekko-green)" }} />
            Gai Daily Brief
          </h1>
          <p className="text-sm mt-1 font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
            Orchestrator activity and task summary
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date picker */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={today}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-white"
            style={{
              backgroundColor: "var(--gekko-card)",
              border: "1px solid var(--gekko-border)",
              fontFamily: "'Nunito', sans-serif",
              colorScheme: "dark",
            }}
          />
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
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Available dates quick-select */}
      {availableDates && availableDates.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availableDates.slice(0, 7).map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className="px-3 py-1 rounded-lg text-xs font-bold transition-all duration-150"
              style={{
                backgroundColor: d === selectedDate ? "var(--gekko-green)" : "rgba(255,255,255,0.07)",
                color: d === selectedDate ? "#000" : "rgba(255,255,255,0.75)",
                border: d === selectedDate ? "none" : "1px solid var(--gekko-border)",
              }}
            >
              {formatDateTab(d)}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2.5 text-sm py-6" style={{ color: "rgba(255,255,255,0.5)" }}>
          <Loader2 size={16} className="animate-spin" style={{ color: "var(--gekko-green)" }} />
          Loading brief for {selectedDate}...
        </div>
      ) : brief ? (
        <div className="space-y-3">

          {/* Summary Stats */}
          <Section title="Summary Stats" icon={<BarChart3 size={15} />} defaultOpen>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Cycles Run", value: brief.summary.cycles_run, color: "var(--gekko-green)" },
                { label: "Tasks Delegated", value: brief.summary.tasks_delegated, color: "#60a5fa" },
                { label: "Tasks Completed", value: brief.summary.tasks_completed, color: "var(--gekko-green)" },
                {
                  label: "Errors",
                  value: brief.summary.errors,
                  color: brief.summary.errors > 0 ? "#f87171" : "rgba(255,255,255,0.85)",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col gap-1.5 p-4 rounded-lg"
                  style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid var(--gekko-border)" }}
                >
                  <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {s.label}
                  </span>
                  <span className="text-3xl font-black leading-none" style={{ color: s.color }}>
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* Eswan's Actions Today */}
          <Section
            title="Eswan's Actions Today"
            icon={<Activity size={15} />}
            count={brief.eswan_actions_today.length}
            defaultOpen
          >
            {brief.eswan_actions_today.length === 0 ? (
              <Empty message="No actions taken today." />
            ) : (
              <div>
                <div className="space-y-0">
                  {displayedActions.map(
                    (t: {
                      id: string;
                      name: string;
                      eswan_action: string | null;
                      status: string;
                      priority: string;
                      eswan_action_at: string | null;
                    }) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 py-3 text-sm"
                        style={{ borderBottom: "1px solid var(--gekko-border)" }}
                      >
                        <span className="text-white font-semibold flex-1 truncate min-w-0">{t.name}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-bold shrink-0"
                          style={{
                            backgroundColor:
                              t.eswan_action === "cancel"
                                ? "rgba(248,113,113,0.15)"
                                : t.eswan_action === "go_ahead"
                                ? "rgba(0,255,65,0.12)"
                                : "rgba(251,191,36,0.12)",
                            color:
                              t.eswan_action === "cancel"
                                ? "#f87171"
                                : t.eswan_action === "go_ahead"
                                ? "var(--gekko-green)"
                                : "#fbbf24",
                          }}
                        >
                          {formatEswanAction(t.eswan_action)}
                        </span>
                        <StatusBadge status={t.status as never} />
                        <span
                          className="text-xs shrink-0 font-mono"
                          style={{ color: "rgba(255,255,255,0.4)" }}
                        >
                          {t.eswan_action_at
                            ? new Date(t.eswan_action_at).toLocaleTimeString("en-ZA", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                    )
                  )}
                </div>
                {brief.eswan_actions_today.length > PAGE_SIZE && (
                  <button
                    onClick={() => setActionsExpanded((v) => !v)}
                    className="flex items-center gap-1.5 mt-3 text-xs font-bold transition-colors duration-150"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gekko-green)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
                  >
                    <ExpandIcon
                      size={12}
                      style={{
                        transform: actionsExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 150ms",
                      }}
                    />
                    {actionsExpanded
                      ? "Show fewer"
                      : `Show all ${brief.eswan_actions_today.length} actions`}
                  </button>
                )}
              </div>
            )}
          </Section>

          {/* Completed Tasks */}
          <Section
            title="Completed Tasks"
            icon={<CheckCircle2 size={15} />}
            count={brief.completed_tasks.length}
            defaultOpen={false}
          >
            {brief.completed_tasks.length === 0 ? (
              <Empty message="No tasks completed on this date." />
            ) : (
              <div>
                {brief.completed_tasks.map((t: { id: string; name: string; updated_at: string }) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 py-3 text-sm"
                    style={{ borderBottom: "1px solid var(--gekko-border)" }}
                  >
                    <CheckCircle2 size={13} style={{ color: "var(--gekko-green)", flexShrink: 0 }} />
                    <span className="text-white font-medium flex-1 truncate">{t.name}</span>
                    <span className="text-xs font-mono shrink-0" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {new Date(t.updated_at).toLocaleTimeString("en-ZA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* In Progress */}
          <Section
            title="In Progress"
            icon={<Clock size={15} />}
            accentColor="#60a5fa"
            count={brief.in_progress.length}
            defaultOpen={false}
          >
            {brief.in_progress.length === 0 ? (
              <Empty message="No in-progress tasks at this time." />
            ) : (
              <div>
                {brief.in_progress.map(
                  (t: {
                    id: string;
                    name: string;
                    status: string;
                    priority: string;
                    delegated_to: string | null;
                    updated_at: string;
                  }) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 py-3 text-sm"
                      style={{ borderBottom: "1px solid var(--gekko-border)" }}
                    >
                      <span className="text-white font-semibold flex-1 truncate min-w-0">{t.name}</span>
                      <StatusBadge status={t.status as never} />
                      <span
                        className="text-xs shrink-0 font-semibold"
                        style={{ color: "rgba(255,255,255,0.55)" }}
                      >
                        {formatDelegatedTo(t.delegated_to)}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </Section>

          {/* Blocked */}
          <Section
            title="Blocked"
            icon={<XCircle size={15} />}
            accentColor="#f87171"
            count={brief.blocked.length}
            defaultOpen={false}
          >
            {brief.blocked.length === 0 ? (
              <Empty message="No blocked tasks." />
            ) : (
              <div>
                {brief.blocked.map(
                  (t: {
                    id: string;
                    name: string;
                    status: string;
                    priority: string;
                    delegated_to: string | null;
                    updated_at: string;
                  }) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 py-3 text-sm"
                      style={{ borderBottom: "1px solid var(--gekko-border)" }}
                    >
                      <span className="text-white font-semibold flex-1 truncate min-w-0">{t.name}</span>
                      <StatusBadge status={t.status as never} />
                      <span
                        className="text-xs shrink-0 font-semibold"
                        style={{ color: "rgba(255,255,255,0.55)" }}
                      >
                        {formatDelegatedTo(t.delegated_to)}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </Section>

          {/* Awaiting Decision */}
          <Section
            title="Awaiting Decision"
            icon={<AlertTriangle size={15} />}
            accentColor="#fbbf24"
            count={brief.awaiting_decision.length}
            defaultOpen={false}
          >
            {brief.awaiting_decision.length === 0 ? (
              <Empty message="No tasks awaiting decision." />
            ) : (
              <div>
                {brief.awaiting_decision.map(
                  (t: {
                    id: string;
                    name: string;
                    status: string;
                    priority: string;
                    delegated_to: string | null;
                    updated_at: string;
                  }) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 py-3 text-sm"
                      style={{ borderBottom: "1px solid var(--gekko-border)" }}
                    >
                      <span className="text-white font-semibold flex-1 truncate min-w-0">{t.name}</span>
                      <StatusBadge status={t.status as never} />
                      <span
                        className="text-xs shrink-0 font-semibold"
                        style={{ color: "rgba(255,255,255,0.55)" }}
                      >
                        {formatDelegatedTo(t.delegated_to)}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </Section>

          {/* Delegated Logs */}
          <Section
            title="Delegated Logs"
            icon={<Send size={15} />}
            accentColor="#a78bfa"
            count={brief.delegated_logs.length}
            defaultOpen={false}
          >
            {brief.delegated_logs.length === 0 ? (
              <Empty message="No delegation logs for this date." />
            ) : (
              <div>
                {brief.delegated_logs.map(
                  (l: {
                    id: string;
                    action_type: string | null;
                    status: string | null;
                    message: string | null;
                    created_at: string;
                  }) => (
                    <LogRow key={l.id} log={l} />
                  )
                )}
              </div>
            )}
          </Section>

          {/* Error Logs */}
          <Section
            title="Error Logs"
            icon={<AlertTriangle size={15} />}
            accentColor={brief.error_logs.length > 0 ? "#f87171" : "rgba(255,255,255,0.35)"}
            count={brief.error_logs.length}
            defaultOpen={brief.error_logs.length > 0}
          >
            {brief.error_logs.length === 0 ? (
              <div className="flex items-center gap-2 text-sm py-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                <CheckCircle2 size={14} style={{ color: "var(--gekko-green)" }} />
                No errors recorded for this date.
              </div>
            ) : (
              <div>
                {brief.error_logs.map(
                  (l: {
                    id: string;
                    action_type: string | null;
                    status: string | null;
                    message: string | null;
                    created_at: string;
                  }) => (
                    <LogRow key={l.id} log={l} />
                  )
                )}
              </div>
            )}
          </Section>

          {/* Gmail Highlights */}
          <Section
            title="Gmail Highlights"
            icon={<Mail size={15} />}
            accentColor="#60a5fa"
            count={brief.gmail_highlights.length}
            defaultOpen={false}
          >
            {brief.gmail_highlights.length === 0 ? (
              <Empty message="No Gmail highlights for this date." />
            ) : (
              <div className="space-y-2">
                {brief.gmail_highlights.map((g: { from: string; subject: string }, i: number) => (
                  <div
                    key={i}
                    className="px-4 py-3 rounded-lg text-sm"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid var(--gekko-border)" }}
                  >
                    <div className="font-semibold text-white">{g.subject}</div>
                    <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {g.from}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      ) : (
        <div
          className="p-10 rounded-xl text-center"
          style={{ backgroundColor: "var(--gekko-card)", border: "1px solid var(--gekko-border)" }}
        >
          <BookOpen size={36} className="mx-auto mb-4" style={{ color: "rgba(255,255,255,0.2)" }} />
          <p className="text-white font-bold text-base">No brief available for {selectedDate}</p>
          <p className="text-sm mt-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
            The Gai orchestrator runs daily at 07:00 SAST.
          </p>
        </div>
      )}
    </div>
  );
}
