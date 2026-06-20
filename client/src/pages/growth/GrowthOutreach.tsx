import { trpc } from "@/lib/trpc";
import { Loader2, Mail, Play, Pause, Clock, PlusCircle } from "lucide-react";
import { toast } from "sonner";

const AMBER = "#F59E0B";

function statusColor(status: string | null) {
  switch (status) {
    case "active":
      return "#22c55e";
    case "paused":
      return "#f59e0b";
    case "draft":
      return "rgba(255,255,255,0.4)";
    case "completed":
      return "#3b82f6";
    default:
      return "rgba(255,255,255,0.35)";
  }
}

function statusIcon(status: string | null) {
  switch (status) {
    case "active":
      return <Play size={12} />;
    case "paused":
      return <Pause size={12} />;
    default:
      return <Clock size={12} />;
  }
}

export default function GrowthOutreach() {
  const { data, isLoading } = trpc.growth.campaigns.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  return (
    <div
      className="min-h-screen p-5 md:p-8"
      style={{ backgroundColor: "var(--gekko-black)", fontFamily: "'Nunito', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: AMBER }}>
              Growth Hub
            </span>
          </div>
          <h1 className="text-2xl font-black text-white leading-tight">Outreach</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
            Email campaigns and automated outreach workflows
          </p>
        </div>

        {/* New Campaign button */}
        <button
          onClick={() => toast.info("Campaign builder coming soon")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-150"
          style={{
            backgroundColor: AMBER,
            color: "#000",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#d97706";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = AMBER;
          }}
        >
          <PlusCircle size={15} />
          New Campaign
        </button>
      </div>

      {/* Campaign List */}
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: "var(--gekko-card)", boxShadow: "0 2px 12px rgba(0,0,0,0.25)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-black text-white">Email Campaigns</h2>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
            Read-only · Phase 1
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-8" style={{ color: "rgba(255,255,255,0.45)" }}>
            <Loader2 size={16} className="animate-spin" style={{ color: AMBER }} />
            <span className="text-sm">Loading campaigns...</span>
          </div>
        ) : (data ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl"
              style={{ backgroundColor: `${AMBER}15`, color: AMBER }}
            >
              <Mail size={22} />
            </div>
            <p className="text-sm font-semibold text-white">No campaigns yet</p>
            <p className="text-xs text-center max-w-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Create your first email campaign to start reaching your pipeline. Campaign builder coming soon.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {(data ?? []).map((campaign) => {
              const sc = statusColor(campaign.status);
              return (
                <div
                  key={campaign.id}
                  className="flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-150"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  }}
                >
                  {/* Icon */}
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                    style={{ backgroundColor: `${AMBER}15`, color: AMBER }}
                  >
                    <Mail size={16} />
                  </div>

                  {/* Info */}
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="text-white font-bold text-sm truncate">{campaign.name}</span>
                    {campaign.description && (
                      <span className="text-xs truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
                        {campaign.description}
                      </span>
                    )}
                  </div>

                  {/* Status badge */}
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0"
                    style={{ backgroundColor: `${sc}15`, color: sc }}
                  >
                    {statusIcon(campaign.status)}
                    <span className="text-xs font-black capitalize">{campaign.status ?? "draft"}</span>
                  </div>

                  {/* Date */}
                  <span className="text-xs shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {new Date(campaign.created_at).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
