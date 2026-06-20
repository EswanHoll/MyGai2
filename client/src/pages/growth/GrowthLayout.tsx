import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  GitBranch,
  Send,
  FileText,
  Search,
  BarChart2,
} from "lucide-react";

const AMBER = "#F59E0B";

interface GrowthNavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

const GROWTH_NAV: GrowthNavItem[] = [
  { label: "Overview", path: "/growth", icon: <LayoutDashboard size={14} /> },
  { label: "Pipeline", path: "/growth/pipeline", icon: <GitBranch size={14} /> },
  { label: "Outreach", path: "/growth/outreach", icon: <Send size={14} /> },
  { label: "Content", path: "/growth/content", icon: <FileText size={14} /> },
  { label: "SEO", path: "/growth/seo", icon: <Search size={14} /> },
  { label: "Analytics", path: "/growth/analytics", icon: <BarChart2 size={14} /> },
];

interface GrowthLayoutProps {
  children: ReactNode;
}

export default function GrowthLayout({ children }: GrowthLayoutProps) {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/growth") return location === "/growth" || location === "/growth/";
    return location.startsWith(path);
  };

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Sub-navigation bar */}
      <div
        className="sticky top-[52px] z-30 flex items-center px-5 overflow-x-auto"
        style={{
          backgroundColor: "var(--gekko-sidebar, #16161b)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          height: "44px",
          scrollbarWidth: "none",
        }}
      >
        {GROWTH_NAV.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="relative flex items-center gap-1.5 px-3 h-full text-sm font-bold transition-colors duration-150 whitespace-nowrap shrink-0"
              style={{
                color: active ? AMBER : "rgba(255,255,255,0.55)",
                fontSize: "13px",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.9)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.55)";
              }}
            >
              <span style={{ color: "inherit" }}>{item.icon}</span>
              {item.label}
              {active && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full"
                  style={{ backgroundColor: AMBER }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
