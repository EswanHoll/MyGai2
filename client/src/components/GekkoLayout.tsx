import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  BookOpen,
  CheckSquare,
  ChevronRight,
  LogOut,
  Upload,
  Zap,
} from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  badge?: number;
}

interface GekkoLayoutProps {
  children: ReactNode;
}

export default function GekkoLayout({ children }: GekkoLayoutProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const [location, navigate] = useLocation();

  // Fetch publish queue badge count
  const { data: allTasks } = trpc.tasks.getAll.useQuery(
    { filter: undefined, include_done: false },
    { enabled: isAuthenticated }
  );

  const publishPendingCount = (allTasks ?? []).filter(
    (t) => (t.publish_ready || (t.status === "done" && t.agent_type === "worker_agent")) && !t.published
  ).length;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--gekko-black)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: "var(--gekko-green)" }}
          />
          <span className="text-white font-semibold">Loading GekkoFlow...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const navItems: NavItem[] = [
    { label: "Overview", path: "/", icon: <BarChart3 size={18} /> },
    { label: "Gai Daily Brief", path: "/brief", icon: <BookOpen size={18} /> },
    { label: "Task Dashboard", path: "/tasks", icon: <CheckSquare size={18} /> },
    {
      label: "Publish Queue",
      path: "/publish",
      icon: <Upload size={18} />,
      badge: publishPendingCount > 0 ? publishPendingCount : undefined,
    },
  ];

  const handleNavClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: "var(--gekko-black)", fontFamily: "'Nunito', sans-serif" }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col w-60 shrink-0 fixed top-0 left-0 h-full z-40"
        style={{
          backgroundColor: "var(--gekko-sidebar, #16161b)",
          borderRight: "1px solid var(--gekko-border)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2 px-5 py-5"
          style={{ borderBottom: "1px solid var(--gekko-border)" }}
        >
          <div
            className="flex items-center justify-center w-8 h-8 rounded-md"
            style={{ backgroundColor: "var(--gekko-green)", color: "#000" }}
          >
            <Zap size={16} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">GekkoFlow</div>
            <div className="text-xs leading-tight" style={{ color: "var(--gekko-green)" }}>
              Command Centre
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={handleNavClick}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-all duration-150 group"
                style={{
                  backgroundColor: active ? "var(--gekko-green-glow, rgba(0,255,65,0.12))" : "transparent",
                  color: active ? "var(--gekko-green)" : "rgba(255,255,255,0.8)",
                  border: active ? "1px solid var(--gekko-green-border, rgba(0,255,65,0.25))" : "1px solid transparent",
                }}
              >
                <span
                  style={{ color: active ? "var(--gekko-green)" : "rgba(255,255,255,0.5)" }}
                  className="transition-colors duration-150 group-hover:text-white"
                >
                  {item.icon}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
                    style={{ backgroundColor: "var(--gekko-green)", color: "#000" }}
                  >
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
                {active && (
                  <ChevronRight
                    size={14}
                    style={{ color: "var(--gekko-green)" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div
          className="px-4 py-4"
          style={{ borderTop: "1px solid var(--gekko-border)" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0"
              style={{ backgroundColor: "var(--gekko-green)", color: "#000" }}
            >
              {user?.name?.charAt(0)?.toUpperCase() ?? "E"}
            </div>
            <div className="min-w-0">
              <div className="text-white text-sm font-semibold truncate">{user?.name ?? "Eswan"}</div>
              <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
                {user?.email ?? "GekkoTech"}
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate("/api/auth/logout")}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-colors duration-150"
            style={{ color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex-1 ml-60 min-h-screen" style={{ backgroundColor: "var(--gekko-black)" }}>
        {children}
      </main>
    </div>
  );
}
