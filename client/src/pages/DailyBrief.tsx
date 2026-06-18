import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { BookOpen, ChevronDown, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { StatusBadge } from "@/components/gekko/Badges";
import { formatDelegatedTo, formatEswanAction, formatDateTab } from "@/lib/labels";

// ─── Collapsible Section ─────────────────────────────────────────────────────

function Section({
  title,
  defaultOpen = true,
  children,
  count,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  count?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: "var(--gekko-card)", border: "1px solid var(--gekko-border)" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-4 py-3 text-left"
        style={{ borderBottom: open ? "1px solid var(--gekko-border)" : "none" }}
      >
        <span style={{ color: "rgba(255,255,255,0.5)" }}>
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>
        <span className="font-bold text-white text-sm flex-1">{title}</span>
        {count !== undefined && (
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
            {count}
          </span>
        )}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function Empty({ message }: { message: string }) {
  return <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{message}</p>;
}

// ─── Log Row ─────────────────────────────────────────────────────────────────

function LogRow({ log }: { log: { id: string; action_type: string | null; status: string | null; message: string | null; created_at: string } }) {
  return (
    <div className="flex items-start gap-3 py-2 text-sm" style={{ borderBottom: "1px solid var(--gekko-border)" }}>
      <span className="text-xs shrink-0 mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
        {new Date(log.created_at).toLocaleTimeString()}
      </span>
      <span className="text-xs px-1.5 py-0.5 rounded shrink-0"
        style={{
          backgroundColor: log.status === "error" ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.07)",
          color: log.status === "error" ? "#f87171" : "rgba(255,255,255,0.6)"
        }}>
        {log.action_type ?? "log"}
      </span>
      <span className="text-white text-xs">{log.message ?? "—"}</span>
    </div>
  );
}

// ─── Daily Brief Page ─────────────────────────────────────────────────────────

export default function DailyBrief() {
  const today = useMemo(() => new Date().toISOString().substring(0, 10), []);
  const [selectedDate, setSelectedDate] = useState(today);

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

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen size={22} style={{ color: "var(--gekko-green)" }} />
            Gai Daily Brief
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
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
            className="px-3 py-2 rounded text-sm text-white"
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
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold"
            style={{ backgroundColor: "var(--gekko-card)", border: "1px solid var(--gekko-border)", color: "rgba(255,255,255,0.8)" }}
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Available dates hint */}
      {availableDates && availableDates.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availableDates.slice(0, 7).map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDate(d)}
              className="px-2.5 py-1 rounded text-xs font-bold transition-all"
              style={{
                backgroundColor: d === selectedDate ? "var(--gekko-green)" : "rgba(255,255,255,0.08)",
                color: d === selectedDate ? "#000" : "rgba(255,255,255,0.7)",
                border: d === selectedDate ? "none" : "1px solid var(--gekko-border)",
              }}
            >
              {formatDateTab(d)}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
          <Loader2 size={16} className="animate-spin" />
          Loading brief for {selectedDate}...
        </div>
      ) : brief ? (
        <div className="space-y-3">
          {/* Summary Stats */}
          <Section title="Summary Stats" defaultOpen>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Cycles Run", value: brief.summary.cycles_run },
                { label: "Tasks Delegated", value: brief.summary.tasks_delegated },
                { label: "Tasks Completed", value: brief.summary.tasks_completed },
                { label: "Errors", value: brief.summary.errors },
              ].map((s) => (
                <div key={s.label}
                  className="flex flex-col gap-1 p-3 rounded"
                  style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid var(--gekko-border)" }}>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{s.label}</span>
                  <span className="text-2xl font-bold text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Eswan's Actions Today */}
          <Section title="Eswan's Actions Today" count={brief.eswan_actions_today.length} defaultOpen>
            {brief.eswan_actions_today.length === 0 ? (
              <Empty message="No actions taken today." />
            ) : (
              <div className="space-y-1">
                {brief.eswan_actions_today.map((t: { id: string; name: string; eswan_action: string | null; status: string; priority: string; eswan_action_at: string | null }) => (
                  <div key={t.id} className="flex items-center gap-3 py-2 text-sm"
                    style={{ borderBottom: "1px solid var(--gekko-border)" }}>
                    <span className="text-white font-semibold flex-1 truncate">{t.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded font-semibold"
                      style={{ backgroundColor: "rgba(0,255,65,0.12)", color: "var(--gekko-green)" }}>
                      {formatEswanAction(t.eswan_action)}
                    </span>
                    <StatusBadge status={t.status as never} />
                    <span className="text-xs shrink-0" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {t.eswan_action_at ? new Date(t.eswan_action_at).toLocaleTimeString() : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Completed Tasks */}
          <Section title="Completed Tasks" count={brief.completed_tasks.length} defaultOpen={false}>
            {brief.completed_tasks.length === 0 ? (
              <Empty message="No tasks completed on this date." />
            ) : (
              <div className="space-y-1">
                {brief.completed_tasks.map((t: { id: string; name: string; updated_at: string }) => (
                  <div key={t.id} className="flex items-center gap-3 py-2 text-sm"
                    style={{ borderBottom: "1px solid var(--gekko-border)" }}>
                    <span className="text-white flex-1 truncate">{t.name}</span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {new Date(t.updated_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* In Progress */}
          <Section title="In Progress" count={brief.in_progress.length} defaultOpen={false}>
            {brief.in_progress.length === 0 ? (
              <Empty message="No in-progress tasks at this time." />
            ) : (
              <div className="space-y-1">
                {brief.in_progress.map((t: { id: string; name: string; status: string; priority: string; delegated_to: string | null; updated_at: string }) => (
                  <div key={t.id} className="flex items-center gap-3 py-2 text-sm"
                    style={{ borderBottom: "1px solid var(--gekko-border)" }}>
                    <span className="text-white font-semibold flex-1 truncate">{t.name}</span>
                    <StatusBadge status={t.status as never} />
                    <span className="text-xs shrink-0 font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>{formatDelegatedTo(t.delegated_to)}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Blocked */}
          <Section title="Blocked" count={brief.blocked.length} defaultOpen={false}>
            {brief.blocked.length === 0 ? (
              <Empty message="No blocked tasks." />
            ) : (
              <div className="space-y-1">
                {brief.blocked.map((t: { id: string; name: string; status: string; priority: string; delegated_to: string | null; updated_at: string }) => (
                  <div key={t.id} className="flex items-center gap-3 py-2 text-sm"
                    style={{ borderBottom: "1px solid var(--gekko-border)" }}>
                    <span className="text-white font-semibold flex-1 truncate">{t.name}</span>
                    <StatusBadge status={t.status as never} />
                    <span className="text-xs shrink-0 font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>{formatDelegatedTo(t.delegated_to)}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Awaiting Decision */}
          <Section title="Awaiting Decision" count={brief.awaiting_decision.length} defaultOpen={false}>
            {brief.awaiting_decision.length === 0 ? (
              <Empty message="No tasks awaiting decision." />
            ) : (
              <div className="space-y-1">
                {brief.awaiting_decision.map((t: { id: string; name: string; status: string; priority: string; delegated_to: string | null; updated_at: string }) => (
                  <div key={t.id} className="flex items-center gap-3 py-2 text-sm"
                    style={{ borderBottom: "1px solid var(--gekko-border)" }}>
                    <span className="text-white font-semibold flex-1 truncate">{t.name}</span>
                    <StatusBadge status={t.status as never} />
                    <span className="text-xs shrink-0 font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>{formatDelegatedTo(t.delegated_to)}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Delegated Logs */}
          <Section title="Delegated Logs" count={brief.delegated_logs.length} defaultOpen={false}>
            {brief.delegated_logs.length === 0 ? (
              <Empty message="No delegation logs for this date." />
            ) : (
              <div>
                {brief.delegated_logs.map((l: { id: string; action_type: string | null; status: string | null; message: string | null; created_at: string }) => (
                  <LogRow key={l.id} log={l} />
                ))}
              </div>
            )}
          </Section>

          {/* Error Logs */}
          <Section title="Error Logs" count={brief.error_logs.length} defaultOpen>
            {brief.error_logs.length === 0 ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--gekko-green)" }}>
                ✓ No errors recorded for this date.
              </div>
            ) : (
              <div>
                {brief.error_logs.map((l: { id: string; action_type: string | null; status: string | null; message: string | null; created_at: string }) => (
                  <LogRow key={l.id} log={l} />
                ))}
              </div>
            )}
          </Section>

          {/* Gmail Highlights */}
          <Section title="Gmail Highlights" count={brief.gmail_highlights.length} defaultOpen={false}>
            {brief.gmail_highlights.length === 0 ? (
              <Empty message="No Gmail highlights for this date." />
            ) : (
              <div className="space-y-1.5">
                {brief.gmail_highlights.map((g: { from: string; subject: string }, i: number) => (
                  <div key={i} className="px-3 py-2 rounded text-sm"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid var(--gekko-border)" }}>
                    <div className="font-semibold text-white">{g.subject}</div>
                    <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{g.from}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      ) : (
        <div
          className="p-8 rounded-lg text-center"
          style={{ backgroundColor: "var(--gekko-card)", border: "1px solid var(--gekko-border)" }}
        >
          <BookOpen size={32} className="mx-auto mb-3" style={{ color: "rgba(255,255,255,0.3)" }} />
          <p className="text-white font-semibold">No brief available for {selectedDate}</p>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
            The Gai orchestrator runs daily at 07:00 SAST.
          </p>
        </div>
      )}
    </div>
  );
}
