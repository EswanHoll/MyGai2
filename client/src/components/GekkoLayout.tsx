import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  BookOpen,
  CheckSquare,
  LogOut,
  Upload,
  Zap,
  ChevronDown,
} from "lucide-react";
import { type ReactNode, useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import QuickTaskFAB from "./gekko/QuickTaskFAB";

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
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fetch publish queue badge count
  const { data: allTasks } = trpc.tasks.getAll.useQuery(
    { filter: undefined, include_done: false },
    { enabled: isAuthenticated }
  );

  const publishPendingCount = (allTasks ?? []).filter(
    (t) => (t.publish_ready || (t.status === "done" && t.agent_type === "worker_agent")) && !t.published
  ).length;

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
    { label: "Overview", path: "/", icon: <BarChart3 size={15} /> },
    { label: "Gai Daily Brief", path: "/brief", icon: <BookOpen size={15} /> },
    { label: "Task Dashboard", path: "/tasks", icon: <CheckSquare size={15} /> },
    {
      label: "Publish Queue",
      path: "/publish",
      icon: <Upload size={15} />,
      badge: publishPendingCount > 0 ? publishPendingCount : undefined,
    },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location === "/" || location === "";
    return location.startsWith(path);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--gekko-black)", fontFamily: "'Nunito', sans-serif" }}
    >
      {/* ── Top Nav ──────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 flex items-center gap-0"
        style={{
          backgroundColor: "var(--gekko-sidebar, #16161b)",
          borderBottom: "1px solid var(--gekko-border)",
          height: "52px",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2 px-5 shrink-0"
          style={{ borderRight: "1px solid var(--gekko-border)", height: "100%" }}
        >
          <div
            className="flex items-center justify-center w-7 h-7 rounded-md"
            style={{ backgroundColor: "var(--gekko-green)", color: "#000" }}
          >
            <Zap size={14} strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-white font-black text-sm leading-tight tracking-tight">GekkoFlow</div>
            <div className="text-xs leading-tight font-semibold" style={{ color: "var(--gekko-green)", fontSize: "10px" }}>
              Command Centre
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex items-center flex-1 px-2 h-full overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="relative flex items-center gap-2 px-4 h-full text-sm font-bold transition-colors duration-150 whitespace-nowrap shrink-0"
                style={{
                  color: active ? "var(--gekko-green)" : "rgba(255,255,255,0.65)",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.95)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.65)";
                }}
              >
                <span style={{ color: "inherit" }}>{item.icon}</span>
                {item.label}
                {item.badge !== undefined && (
                  <span
                    className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-xs font-black"
                    style={{ backgroundColor: "var(--gekko-green)", color: "#000", fontSize: "10px" }}
                  >
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
                {/* Active underline indicator */}
                {active && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full"
                    style={{ backgroundColor: "var(--gekko-green)" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User menu */}
        <div className="relative shrink-0 px-3" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors duration-150"
            style={{
              backgroundColor: userMenuOpen ? "rgba(255,255,255,0.07)" : "transparent",
              border: "1px solid transparent",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = userMenuOpen ? "rgba(255,255,255,0.07)" : "transparent")}
          >
            <div
              className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-black shrink-0"
              style={{ backgroundColor: "var(--gekko-green)", color: "#000" }}
            >
              {user?.name?.charAt(0)?.toUpperCase() ?? "E"}
            </div>
            <span className="text-sm font-bold text-white hidden sm:block max-w-[120px] truncate">
              {user?.name?.split(" ")[0] ?? "Eswan"}
            </span>
            <ChevronDown
              size={13}
              className="transition-transform duration-150"
              style={{
                color: "rgba(255,255,255,0.5)",
                transform: userMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-52 rounded-xl py-1 z-50"
              style={{
                backgroundColor: "#1e1e28",
                border: "1px solid var(--gekko-border)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}
            >
              <div className="px-4 py-2.5" style={{ borderBottom: "1px solid var(--gekko-border)" }}>
                <div className="text-sm font-bold text-white truncate">{user?.name ?? "Eswan Holl"}</div>
                <div className="text-xs truncate mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {user?.email ?? "eswan@gekkotech.co.za"}
                </div>
              </div>
              <button
                onClick={() => { setUserMenuOpen(false); logout(); }}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-semibold transition-colors duration-150"
                style={{ color: "rgba(255,255,255,0.7)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                }}
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <main className="flex-1 w-full">
        {children}
      </main>

      {/* ── Quick Task FAB ──────────────────────────────────────────────── */}
      <QuickTaskFAB />
    </div>
  );
}
