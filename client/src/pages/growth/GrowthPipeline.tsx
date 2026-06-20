import { trpc } from "@/lib/trpc";
import TierFilter, { type Tier } from "@/components/TierFilter";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User,
  Building2,
  Mail,
  Phone,
  Activity,
  DollarSign,
  Clock,
} from "lucide-react";
import { useState } from "react";

const AMBER = "#F59E0B";

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-black text-white">{title}</h2>
      {subtitle && (
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ─── Contacts List ────────────────────────────────────────────────────────────

function ContactsList() {
  const [tier, setTier] = useState<Tier>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.growth.contacts.list.useQuery(
    { tier, search: debouncedSearch || undefined, page, pageSize: 20 },
    {}
  );

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    // Simple debounce via timeout
    clearTimeout((window as unknown as Record<string, unknown>)._contactSearchTimer as ReturnType<typeof setTimeout>);
    (window as unknown as Record<string, unknown>)._contactSearchTimer = setTimeout(() => {
      setDebouncedSearch(val);
    }, 350) as unknown as ReturnType<typeof setTimeout>;
  };

  const handleTierChange = (t: Tier) => {
    setTier(t);
    setPage(1);
  };

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: "var(--gekko-card)", boxShadow: "0 2px 12px rgba(0,0,0,0.25)" }}
    >
      <SectionHeader title="Contacts" subtitle="All CRM contacts across the platform" />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <TierFilter value={tier} onChange={handleTierChange} />
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1"
          style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            minWidth: "180px",
            maxWidth: "320px",
          }}
        >
          <Search size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name or email..."
            className="bg-transparent outline-none flex-1 text-sm text-white placeholder:text-white/30"
            style={{ fontSize: "14px" }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {["Name", "Email", "Phone", "Tier", "Company"].map((h) => (
                <th
                  key={h}
                  className="text-left pb-2 font-bold text-xs uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px", paddingRight: "16px" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center">
                  <Loader2 size={20} className="animate-spin inline-block" style={{ color: AMBER }} />
                </td>
              </tr>
            ) : (data?.contacts ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                  No contacts found
                </td>
              </tr>
            ) : (
              (data?.contacts ?? []).map((c) => (
                <tr
                  key={c.id}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  className="transition-colors duration-100"
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center justify-center w-7 h-7 rounded-full shrink-0"
                        style={{ backgroundColor: `${AMBER}18`, color: AMBER }}
                      >
                        <User size={12} />
                      </div>
                      <span className="text-white font-semibold" style={{ fontSize: "14px" }}>
                        {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-1.5">
                      <Mail size={12} style={{ color: "rgba(255,255,255,0.3)" }} />
                      <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px" }}>{c.email ?? "—"}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-1.5">
                      <Phone size={12} style={{ color: "rgba(255,255,255,0.3)" }} />
                      <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px" }}>{c.phone ?? "—"}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    {c.tier ? (
                      <span
                        className="px-2 py-0.5 rounded-md text-xs font-black"
                        style={{ backgroundColor: `${AMBER}20`, color: AMBER }}
                      >
                        {c.tier}
                      </span>
                    ) : (
                      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "14px" }}>—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={12} style={{ color: "rgba(255,255,255,0.3)" }} />
                      <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px" }}>
                        {c.company?.name ?? "—"}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(data?.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            {data?.total ?? 0} contacts · Page {page} of {data?.totalPages ?? 1}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                color: page === 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data?.totalPages ?? 1, p + 1))}
              disabled={page >= (data?.totalPages ?? 1)}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                color: page >= (data?.totalPages ?? 1) ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Deals Kanban ─────────────────────────────────────────────────────────────

function DealsKanban() {
  const { data, isLoading } = trpc.growth.deals.byStage.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: "var(--gekko-card)", boxShadow: "0 2px 12px rgba(0,0,0,0.25)" }}
    >
      <SectionHeader title="Deals Pipeline" subtitle="Kanban view by pipeline stage" />

      {isLoading ? (
        <div className="flex items-center gap-2 py-6" style={{ color: "rgba(255,255,255,0.45)" }}>
          <Loader2 size={16} className="animate-spin" style={{ color: AMBER }} />
          <span className="text-sm">Loading pipeline...</span>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
          {(data?.columns ?? []).map(({ stage, deals }) => (
            <div
              key={stage.id}
              className="flex flex-col gap-2 shrink-0"
              style={{ width: "240px" }}
            >
              {/* Stage header */}
              <div
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}
              >
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: AMBER }}>
                  {stage.name}
                </span>
                <span
                  className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-black"
                  style={{ backgroundColor: AMBER, color: "#000" }}
                >
                  {deals.length}
                </span>
              </div>

              {/* Deal cards */}
              {deals.length === 0 ? (
                <div
                  className="flex items-center justify-center py-6 rounded-lg text-xs"
                  style={{
                    border: "1px dashed rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.25)",
                  }}
                >
                  No deals
                </div>
              ) : (
                deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="flex flex-col gap-2 p-3 rounded-lg transition-all duration-150"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.07)";
                      e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    }}
                  >
                    <span className="text-white font-bold text-sm leading-tight">{deal.name}</span>
                    <div className="flex items-center gap-1.5">
                      <Building2 size={11} style={{ color: "rgba(255,255,255,0.35)" }} />
                      <span className="text-xs truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
                        {deal.company?.name ?? "—"}
                      </span>
                    </div>
                    {deal.amount != null && (
                      <div className="flex items-center gap-1.5">
                        <DollarSign size={11} style={{ color: AMBER }} />
                        <span className="text-xs font-black" style={{ color: AMBER }}>
                          R {deal.amount.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                    )}
                    {deal.owner_id && (
                      <div className="flex items-center gap-1.5">
                        <User size={11} style={{ color: "rgba(255,255,255,0.3)" }} />
                        <span className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {deal.owner_id}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ))}

          {/* Unassigned column */}
          {(data?.unassigned ?? []).length > 0 && (
            <div className="flex flex-col gap-2 shrink-0" style={{ width: "240px" }}>
              <div
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Unassigned
                </span>
                <span
                  className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-black"
                  style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "white" }}
                >
                  {data!.unassigned.length}
                </span>
              </div>
              {data!.unassigned.map((deal) => (
                <div
                  key={deal.id}
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <span className="text-white font-bold text-sm">{deal.name}</span>
                </div>
              ))}
            </div>
          )}

          {(data?.columns ?? []).length === 0 && (
            <p className="text-sm py-4" style={{ color: "rgba(255,255,255,0.35)" }}>
              No pipeline stages configured yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

function ActivityLog() {
  const { data, isLoading } = trpc.growth.activities.recent.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: "var(--gekko-card)", boxShadow: "0 2px 12px rgba(0,0,0,0.25)" }}
    >
      <SectionHeader title="Recent Activity" subtitle="Last 20 CRM activities" />

      {isLoading ? (
        <div className="flex items-center gap-2 py-4" style={{ color: "rgba(255,255,255,0.45)" }}>
          <Loader2 size={16} className="animate-spin" style={{ color: AMBER }} />
          <span className="text-sm">Loading activity...</span>
        </div>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm py-4" style={{ color: "rgba(255,255,255,0.35)" }}>
          No recent activity found.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {(data ?? []).map((act) => (
            <div
              key={act.id}
              className="flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors duration-100"
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <div
                className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 mt-0.5"
                style={{ backgroundColor: `${AMBER}15`, color: AMBER }}
              >
                <Activity size={12} />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-white font-semibold text-sm leading-tight">
                  {act.subject ?? act.type ?? "Activity"}
                </span>
                {act.body && (
                  <span
                    className="text-xs truncate"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    {act.body}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Clock size={11} style={{ color: "rgba(255,255,255,0.25)" }} />
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>
                  {new Date(act.created_at).toLocaleDateString("en-ZA", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GrowthPipeline() {
  return (
    <div
      className="min-h-screen p-5 md:p-8"
      style={{ backgroundColor: "var(--gekko-black)", fontFamily: "'Nunito', sans-serif" }}
    >
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: AMBER }}>
            Growth Hub
          </span>
        </div>
        <h1 className="text-2xl font-black text-white leading-tight">Pipeline</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          Contacts, deals, and CRM activity across all tiers
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <ContactsList />
        <DealsKanban />
        <ActivityLog />
      </div>
    </div>
  );
}
