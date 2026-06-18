/** Human-readable labels for raw database enum values */

export function formatDelegatedTo(raw: string | null | undefined): string {
  if (!raw) return "—";
  const map: Record<string, string> = {
    eswan_approval: "Eswan",
    gai_strategic: "Gai",
    worker_agent: "Worker Agent",
    gai_orchestrator: "Orchestrator",
  };
  return map[raw] ?? raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatEswanAction(raw: string | null | undefined): string {
  if (!raw) return "—";
  const map: Record<string, string> = {
    go_ahead: "Go Ahead",
    cancel: "Cancelled",
    hold: "On Hold",
    reschedule: "Rescheduled",
    reply: "Replied",
  };
  return map[raw] ?? raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatStatus(raw: string | null | undefined): string {
  if (!raw) return "—";
  const map: Record<string, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    done: "Done",
    cancelled: "Cancelled",
    blocked: "Blocked",
  };
  return map[raw] ?? raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatPriority(raw: string | null | undefined): string {
  if (!raw) return "Normal";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export function formatDate(raw: string | null | undefined): string {
  if (!raw) return "—";
  try {
    const d = new Date(raw);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return raw;
  }
}

export function formatDateTab(raw: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (raw === today) return "Today";
  if (raw === yesterday) return "Yesterday";
  try {
    const d = new Date(raw + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return raw;
  }
}
