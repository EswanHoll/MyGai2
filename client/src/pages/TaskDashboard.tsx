import { trpc } from "@/lib/trpc";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  X,
  Layers,
} from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/gekko/Badges";
import TaskActionGroup from "@/components/gekko/TaskActionGroup";
import TaskDetailDrawer from "@/components/gekko/TaskDetailDrawer";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { GaiTask } from "../../../server/gekkodb";
import { formatDelegatedTo, formatStatus, formatPriority, formatDate } from "@/lib/labels";

// ─── Filter bar ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["", "pending", "in_progress", "done", "cancelled", "blocked"];
const PRIORITY_OPTIONS = ["", "urgent", "high", "normal", "low"];

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  projectName,
  selected,
  onSelect,
  bulkMode,
  onOpenDetail,
}: {
  task: GaiTask;
  projectName?: string;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  bulkMode: boolean;
  onOpenDetail: (task: GaiTask) => void;
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 transition-colors duration-150"
      style={{
        borderBottom: "1px solid var(--gekko-border)",
        backgroundColor: selected ? "rgba(0,255,65,0.04)" : "transparent",
      }}
    >
      {bulkMode && (
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(task.id, e.target.checked)}
          className="w-4 h-4 rounded accent-green-400 shrink-0"
          style={{ accentColor: "var(--gekko-green)" }}
        />
      )}

      {/* Task name */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onOpenDetail(task)}
              className="text-sm font-semibold text-white truncate text-left hover:underline"
              style={{ textDecorationColor: "var(--gekko-green)", maxWidth: "clamp(200px, 40vw, 480px)" }}
            >
              {task.name}
            </button>
          </TooltipTrigger>
          <TooltipContent
            style={{ backgroundColor: "var(--gekko-card)", border: "1px solid var(--gekko-border)", color: "white", maxWidth: "300px" }}
          >
            {task.name}
          </TooltipContent>
        </Tooltip>
        {task.manus_task_id && (
          <a
            href={`https://manus.im/app/${task.manus_task_id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--gekko-green)" }}
            title="Open in Manus"
          >
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
      </div>

      {/* Delegated to */}
      <span className="text-xs shrink-0 hidden xl:block font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>
        {formatDelegatedTo(task.delegated_to)}
      </span>

      {/* Created */}
      <span className="text-xs shrink-0 hidden lg:block" style={{ color: "rgba(255,255,255,0.4)" }}>
        {formatDate(task.created_at)}
      </span>

      {/* Actions */}
      <div className="shrink-0">
        <TaskActionGroup task={task} compact />
      </div>
    </div>
  );
}

// ─── Project Group ────────────────────────────────────────────────────────────

function ProjectGroup({
  name,
  tasks,
  projects,
  selectedIds,
  onSelect,
  bulkMode,
  onOpenDetail,
}: {
  name: string;
  tasks: GaiTask[];
  projects: Array<{ id: string; name: string }>;
  selectedIds: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
  bulkMode: boolean;
  onOpenDetail: (task: GaiTask) => void;
}) {
  const [open, setOpen] = useState(true);
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name;

  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "var(--gekko-card)", border: "1px solid var(--gekko-border)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 w-full px-5 py-3.5 text-left transition-colors duration-150"
        style={{ borderBottom: open ? "1px solid var(--gekko-border)" : "none" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <span style={{ color: "var(--gekko-green)", flexShrink: 0 }}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="font-black text-white text-sm flex-1 tracking-wide">{name}</span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-bold"
          style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)" }}
        >
          {tasks.length}
        </span>
      </button>
      {open && (
        <div>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              projectName={projectName(task.project_id ?? "")}
              selected={selectedIds.has(task.id)}
              onSelect={onSelect}
              bulkMode={bulkMode}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Task Dashboard ───────────────────────────────────────────────────────────

export default function TaskDashboard() {
  const [location] = useLocation();
  const utils = trpc.useUtils();

  // Parse URL filter param
  const urlFilter = useMemo(() => {
    const params = new URLSearchParams(location.split("?")[1] ?? "");
    const f = params.get("filter");
    if (f === "awaiting" || f === "urgent" || f === "in_progress" || f === "done_today") return f;
    return undefined;
  }, [location]);

  // Local filter state
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [includeDone, setIncludeDone] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerTask, setDrawerTask] = useState<GaiTask | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Apply URL filter on mount/change
  useEffect(() => {
    if (urlFilter) {
      setStatusFilter("");
      setPriorityFilter("");
      setSearch("");
    }
  }, [urlFilter]);

  // Build query input
  const queryInput = useMemo(() => {
    if (urlFilter) return { filter: urlFilter as "awaiting" | "urgent" | "in_progress" | "done_today" };
    return {
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      search: search || undefined,
      include_done: includeDone,
    };
  }, [urlFilter, statusFilter, priorityFilter, search, includeDone]);

  const { data: tasks, isLoading } = trpc.tasks.getAll.useQuery(queryInput, {
    refetchOnWindowFocus: false,
  });

  const { data: projects } = trpc.tasks.getProjects.useQuery();

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await utils.tasks.getAll.invalidate();
    await utils.tasks.getStats.invalidate();
    setTimeout(() => setIsRefreshing(false), 600);
  }, [utils]);

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // Normalise project names to canonical display names
  const normaliseProjectName = (raw: string): string => {
    const map: Record<string, string> = {
      "Gai Command Center": "Gai Command Centre",
      "Gai Command Center Build": "Gai Command Centre",
    };
    return map[raw] ?? raw;
  };

  // Group tasks by normalised project display name (merges duplicates)
  const grouped = useMemo(() => {
    const map = new Map<string, GaiTask[]>();
    for (const task of tasks ?? []) {
      const rawName = task.project_id
        ? projects?.find((p) => p.id === task.project_id)?.name ?? "Unassigned"
        : "Unassigned";
      const key = normaliseProjectName(rawName);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  }, [tasks, projects]);

  const getGroupName = (key: string) => key;

  const projectList = projects ?? [];

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5 tracking-tight">
            <CheckSquare size={22} style={{ color: "var(--gekko-green)" }} />
            Task Dashboard
          </h1>
          <p className="text-sm mt-1 font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
            {urlFilter
              ? `Filtered: ${urlFilter === "awaiting" ? "Awaiting Action" : urlFilter === "done_today" ? "Done Today" : urlFilter === "in_progress" ? "In Progress" : "Urgent"}`
              : `${tasks?.length ?? 0} task${(tasks?.length ?? 0) !== 1 ? "s" : ""} across ${grouped.size} project${grouped.size !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-150 active:scale-95"
          style={{ backgroundColor: "var(--gekko-card)", border: "1px solid var(--gekko-border)", color: "rgba(255,255,255,0.8)" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--gekko-green)"; e.currentTarget.style.color = "var(--gekko-green)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--gekko-border)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filter bar */}
      {!urlFilter && (
        <div
          className="flex flex-wrap items-center gap-3 p-4 rounded-xl"
          style={{ backgroundColor: "var(--gekko-card)", border: "1px solid var(--gekko-border)" }}
        >
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <Search size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-white text-sm flex-1 outline-none placeholder:text-white/30"
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ color: "rgba(255,255,255,0.4)" }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--gekko-black)", border: "1px solid var(--gekko-border)", fontFamily: "'Nunito', sans-serif" }}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map((s) => (
              <option key={s} value={s}>{formatStatus(s)}</option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--gekko-black)", border: "1px solid var(--gekko-border)", fontFamily: "'Nunito', sans-serif" }}
          >
            <option value="">All Priorities</option>
            {PRIORITY_OPTIONS.filter(Boolean).map((p) => (
              <option key={p} value={p}>{formatPriority(p)}</option>
            ))}
          </select>

          {/* Done toggle */}
          <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer" style={{ color: "rgba(255,255,255,0.75)" }}>
            <input
              type="checkbox"
              checked={includeDone}
              onChange={(e) => setIncludeDone(e.target.checked)}
              style={{ accentColor: "var(--gekko-green)", width: "15px", height: "15px" }}
            />
            Show completed
          </label>

          {/* Bulk mode */}
          <button
            onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-150"
            style={{
              backgroundColor: bulkMode ? "rgba(0,255,65,0.15)" : "rgba(255,255,255,0.07)",
              color: bulkMode ? "var(--gekko-green)" : "rgba(255,255,255,0.75)",
              border: bulkMode ? "1px solid rgba(0,255,65,0.3)" : "1px solid var(--gekko-border)",
            }}
          >
            <Layers size={12} />
            Bulk {bulkMode && `(${selectedIds.size})`}
          </button>
        </div>
      )}

      {/* URL filter clear */}
      {urlFilter && (
        <button
          onClick={() => window.history.pushState({}, "", "/tasks")}
          className="flex items-center gap-1.5 text-sm font-bold transition-colors duration-150"
          style={{ color: "rgba(255,255,255,0.45)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gekko-green)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
        >
          <X size={13} /> Clear filter — show all tasks
        </button>
      )}

      {/* Tasks */}
      {isLoading ? (
        <div className="flex items-center gap-2.5 text-sm py-6" style={{ color: "rgba(255,255,255,0.5)" }}>
          <Loader2 size={16} className="animate-spin" style={{ color: "var(--gekko-green)" }} />
          Loading tasks...
        </div>
      ) : !tasks || tasks.length === 0 ? (
      <div
        className="p-10 rounded-xl text-center"
        style={{ backgroundColor: "var(--gekko-card)", border: "1px solid var(--gekko-border)" }}
      >
        <CheckSquare size={36} className="mx-auto mb-4" style={{ color: "rgba(255,255,255,0.2)" }} />
        <p className="text-white font-bold text-base">No tasks found</p>
        <p className="text-sm mt-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
          Try adjusting your filters or check back after the next orchestrator cycle.
        </p>
      </div>
      ) : (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([key, groupTasks]) => (
            <ProjectGroup
              key={key}
              name={getGroupName(key)}
              tasks={groupTasks}
              projects={projectList}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              bulkMode={bulkMode}
              onOpenDetail={setDrawerTask}
            />
          ))}
        </div>
      )}

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        task={drawerTask}
        open={!!drawerTask}
        onClose={() => setDrawerTask(null)}
        projectName={drawerTask?.project_id ? projects?.find((p) => p.id === drawerTask.project_id)?.name : undefined}
      />
    </div>
  );
}
