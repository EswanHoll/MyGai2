import { type ReactNode } from "react";

const AMBER = "#F59E0B";

interface ComingSoonPageProps {
  title: string;
  subtitle: string;
  description: string;
  icon: ReactNode;
  capabilities: string[];
}

function ComingSoonPage({
  title,
  subtitle,
  description,
  icon,
  capabilities,
}: ComingSoonPageProps) {
  return (
    <div
      className="min-h-screen p-5 md:p-8"
      style={{ backgroundColor: "var(--gekko-black)", fontFamily: "'Nunito', sans-serif" }}
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: AMBER }}>
            Growth Hub
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-black uppercase tracking-widest"
            style={{ backgroundColor: `${AMBER}20`, color: AMBER }}
          >
            Coming Soon
          </span>
        </div>
        <h1 className="text-2xl font-black text-white leading-tight">{title}</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          {subtitle}
        </p>
      </div>

      {/* Main card */}
      <div
        className="rounded-xl p-8 flex flex-col items-center text-center gap-6 max-w-xl mx-auto"
        style={{
          backgroundColor: "var(--gekko-card)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
          border: `1px solid rgba(245,158,11,0.15)`,
        }}
      >
        {/* Icon */}
        <div
          className="flex items-center justify-center w-16 h-16 rounded-2xl"
          style={{ backgroundColor: `${AMBER}15`, color: AMBER }}
        >
          {icon}
        </div>

        {/* Badge */}
        <div
          className="px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-widest"
          style={{ backgroundColor: `${AMBER}20`, color: AMBER }}
        >
          Coming Soon
        </div>

        {/* Description */}
        <p className="text-base font-semibold text-white leading-relaxed">{description}</p>

        {/* Capabilities list */}
        <div className="w-full flex flex-col gap-2 text-left">
          {capabilities.map((cap) => (
            <div
              key={cap}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg"
              style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: AMBER }}
              />
              <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>
                {cap}
              </span>
            </div>
          ))}
        </div>

        {/* Tagline */}
        <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>
          Better. Faster. Smarter. anytime, anywhere, on any device.
        </p>
      </div>
    </div>
  );
}

// ─── Content Hub ──────────────────────────────────────────────────────────────

export function GrowthContent() {
  return (
    <ComingSoonPage
      title="Content Hub"
      subtitle="AI-powered content creation and multi-channel publishing"
      description="Create, schedule, and publish content across all your channels — social media, email, blog, and more — from a single command centre."
      icon={<span style={{ fontSize: "28px" }}>✍️</span>}
      capabilities={[
        "AI content generation with Nova",
        "Multi-channel scheduling (Instagram, LinkedIn, X)",
        "Content calendar and approval workflow",
        "Performance analytics per post",
        "Brand voice and tone management",
      ]}
    />
  );
}

// ─── SEO & Web ────────────────────────────────────────────────────────────────

export function GrowthSEO() {
  return (
    <ComingSoonPage
      title="SEO & Web"
      subtitle="Search visibility, backlinks, and web performance intelligence"
      description="Monitor your search rankings, track backlinks, audit your site health, and get AI-driven recommendations to dominate your market."
      icon={<span style={{ fontSize: "28px" }}>🔍</span>}
      capabilities={[
        "Keyword rank tracking via Ahrefs",
        "Backlink monitoring and analysis",
        "Site health and technical SEO audits",
        "Competitor gap analysis",
        "AI-generated SEO content briefs",
      ]}
    />
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export function GrowthAnalytics() {
  return (
    <ComingSoonPage
      title="Analytics"
      subtitle="Unified growth metrics and business intelligence"
      description="See the full picture — from top-of-funnel awareness to closed revenue — with unified analytics across all your growth channels and tiers."
      icon={<span style={{ fontSize: "28px" }}>📊</span>}
      capabilities={[
        "Unified funnel analytics across all tiers",
        "Revenue attribution by channel",
        "Cohort analysis and retention metrics",
        "Custom dashboards and report builder",
        "Automated weekly growth reports",
      ]}
    />
  );
}
