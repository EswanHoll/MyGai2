import { trpc } from "@/lib/trpc";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import {
  Users,
  Handshake,
  Building2,
  UserCheck,
  DollarSign,
  TrendingUp,
  UserPlus,
  Share2,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useState, useCallback } from "react";
import { useLocation } from "wouter";

// ─── Amber accent ─────────────────────────────────────────────────────────────
const AMBER = "#F59E0B";

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon,
  loading,
  prefix = "",
  suffix = "",
  isCurrency = false,
}: {
  label: string;
  value: number | null | undefined;
  icon: React.ReactNode;
  loading: boolean;
  prefix?: string;
  suffix?: string;
  isCurrency?: boolean;
}) {
  const formatted =
    value == null
      ? "—"
      : isCurrency
      ? `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      : `${prefix}${value.toLocaleString()}${suffix}`;

  return (
    <div
      className="flex flex-col gap-3 p-5 rounded-xl"
      style={{
        backgroundColor: "var(--gekko-card)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
        minWidth: 0,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.45)", fontSize: "11px" }}
        >
          {label}
        </span>
        <span
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ backgroundColor: `${AMBER}18`, color: AMBER }}
        >
          {icon}
        </span>
      </div>
      {loading ? (
        <Loader2 size={20} className="animate-spin" style={{ color: AMBER }} />
      ) : (
        <div
          className="font-black leading-none tracking-tight text-white"
          style={{ fontSize: "clamp(28px, 4vw, 40px)" }}
        >
          {formatted}
        </div>
      )}
    </div>
  );
}

// ─── Urgent Deal Row ──────────────────────────────────────────────────────────

function UrgentDealRow({
  deal,
}: {
  deal: {
    id: string;
    name: string;
    amount: number | null;
    stage_id: string | null;
    company?: { name: string | null } | null;
  };
}) {
  const [, navigate] = useLocation();
  return (
    <button
      onClick={() => { navigate("/growth/pipeline"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
      className="flex items-center justify-between w-full px-4 py-3 rounded-lg transition-all duration-150 text-left"
      style={{
        backgroundColor: "rgba(245,158,11,0.06)",
        border: "1px solid rgba(245,158,11,0.15)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(245,158,11,0.12)";
        e.currentTarget.style.borderColor = "rgba(245,158,11,0.35)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(245,158,11,0.06)";
        e.currentTarget.style.borderColor = "rgba(245,158,11,0.15)";
      }}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-white font-bold text-sm truncate">{deal.name}</span>
        <span className="text-xs truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
          {deal.company?.name ?? "—"}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {deal.amount != null && (
          <span className="font-black text-sm" style={{ color: AMBER }}>
            R {deal.amount.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}
          </span>
        )}
        <ArrowRight size={14} style={{ color: "rgba(255,255,255,0.35)" }} />
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GrowthOverview() {
  const { data, isLoading, error, refetch, isFetching } = trpc.growth.overview.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const handleSendMessage = useCallback((content: string) => {
    setChatMessages((prev) => [...prev, { role: "user", content }]);
    setChatLoading(true);
    // Nova AI stub — wire to LLM in Phase 2
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Nova AI is being wired up. Growth intelligence coming soon — Better. Faster. Smarter. anytime, anywhere, on any device.",
        },
      ]);
      setChatLoading(false);
    }, 800);
  }, []);

  const kpis = [
    {
      label: "Active T2 Distributors",
      value: data?.active_t2_distributors,
      icon: <Users size={16} />,
    },
    {
      label: "Active T3 Partners",
      value: data?.active_t3_partners,
      icon: <Handshake size={16} />,
    },
    {
      label: "Active T4 Agencies",
      value: data?.active_t4_agencies,
      icon: <Building2 size={16} />,
    },
    {
      label: "Active T5 Clients",
      value: data?.active_t5_clients,
      icon: <UserCheck size={16} />,
    },
    {
      label: "MRR",
      value: data?.mrr,
      icon: <DollarSign size={16} />,
      isCurrency: true,
    },
    {
      label: "Pipeline Value",
      value: data?.pipeline_value,
      icon: <TrendingUp size={16} />,
      isCurrency: true,
    },
    {
      label: "Leads This Month",
      value: data?.leads_this_month,
      icon: <UserPlus size={16} />,
    },
    {
      label: "Content Published",
      value: data?.content_published,
      icon: <Share2 size={16} />,
    },
  ];

  return (
    <div
      className="min-h-screen p-5 md:p-8"
      style={{ backgroundColor: "var(--gekko-black)", fontFamily: "'Nunito', sans-serif" }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-black uppercase tracking-widest"
              style={{ color: AMBER }}
            >
              GekkoTech T1
            </span>
          </div>
          <h1 className="text-2xl font-black text-white leading-tight">Growth Hub</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
            Platform-wide growth intelligence — all tiers, all tenants
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-150"
          style={{
            backgroundColor: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.25)",
            color: AMBER,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(245,158,11,0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(245,158,11,0.1)";
          }}
        >
          {isFetching ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          Refresh
        </button>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl mb-6"
          style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}
        >
          <AlertTriangle size={16} style={{ color: "#EF4444" }} />
          <span className="text-sm font-semibold" style={{ color: "#EF4444" }}>
            Failed to load Growth Hub data. Check GekkoDB connectivity.
          </span>
        </div>
      )}

      {/* ── KPI Grid ────────────────────────────────────────────────────── */}
      <div
        className="grid gap-4 mb-8"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        }}
      >
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            loading={isLoading}
            isCurrency={kpi.isCurrency}
          />
        ))}
      </div>

      {/* ── Bottom Grid: Urgent Pipeline + Nova AI ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Pipeline */}
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--gekko-card)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black text-white">Top Pipeline Deals</h2>
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: AMBER }}
            >
              By Value
            </span>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 py-4" style={{ color: "rgba(255,255,255,0.45)" }}>
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Loading deals...</span>
            </div>
          ) : (data?.urgent_deals ?? []).length === 0 ? (
            <p className="text-sm py-4" style={{ color: "rgba(255,255,255,0.4)" }}>
              No open deals found. Start building your pipeline.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {(data?.urgent_deals ?? []).map((deal) => (
                <UrgentDealRow key={deal.id} deal={deal} />
              ))}
            </div>
          )}
        </div>

        {/* Nova AI Chat */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--gekko-card)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
          }}
        >
          <div
            className="flex items-center gap-2 px-5 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <span
              className="flex items-center justify-center w-6 h-6 rounded-md"
              style={{ backgroundColor: `${AMBER}20`, color: AMBER }}
            >
              ✦
            </span>
            <span className="text-base font-black text-white">Nova AI</span>
            <span
              className="ml-auto text-xs font-bold uppercase tracking-widest"
              style={{ color: AMBER }}
            >
              Growth Intelligence
            </span>
          </div>
          <AIChatBox
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            isLoading={chatLoading}
            placeholder="Ask Nova about your growth pipeline..."
            height={320}
            emptyStateMessage="Ask Nova anything about your growth metrics, pipeline, or outreach strategy."
            suggestedPrompts={[
              "Summarise my pipeline health",
              "Which tier has the most growth potential?",
              "What should I focus on this week?",
            ]}
          />
        </div>
      </div>
    </div>
  );
}
