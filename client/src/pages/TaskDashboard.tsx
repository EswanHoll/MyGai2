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
} from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/gekko/Badges";
import TaskActionGroup from "@/components/gekko/TaskActionGroup";
import TaskDetailDrawer from "@/components/gekko/TaskDetailDrawer";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { GaiTask } from "../../../server/gekkodb";

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
              className="text-sm font-semibold text-white truncate max-w-[200px] text-left hover:underline"
              style={{ textDecorationColor: "var(--gekko-green)" }}
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
      <span className="text-xs shrink-0 hidden xl:block" style={{ color: "rgba(255,255,255,0.5)" }}>
        {task.delegated_to ?? "—"}
      </span>

      {/* Created */}
      <span className="text-xs shrink-0 hidden lg:block" style={{ color: "rgba(255,255,255,0.4)" }}>
        {new Date(task.created_at).toLocaleDateString()}
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
        className="flex items-center gap-2 w-full px-4 py-2.5 text-left"
        style={{ borderBottom: open ? "1px solid var(--gekko-border)" : "none" }}
      >
        <span style={{ color: "rgba(255,255,255,0.5)" }}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="font-bold text-white text-sm flex-1">{name}</span>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
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

  // Group tasks by project
  const grouped = useMemo(() => {
    const map = new Map<string, GaiTask[]>();
    for (const task of tasks ?? []) {
      const key = task.project_id ?? "__unassigned__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  }, [tasks]);

  const getGroupName = (key: string) => {
    if (key === "__unassigned__") return "Unassigned";
    return projects?.find((p) => p.id === key)?.name ?? key;
  };

  const projectList = projects ?? [];

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckSquare size={22} style={{ color: "var(--gekko-green)" }} />
            Task Dashboard
          </h1>
          {urlFilter && (
            <p className="text-sm mt-0.5" style={{ color: "var(--gekko-green)" }}>
              Filtered: {urlFilter.replace("_", " ")}
            </p>
          )}
        </div>
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

      {/* Filter bar */}
      {!urlFilter && (
        <div
          className="flex flex-wrap items-center gap-3 p-3 rounded-lg"
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
            className="px-2 py-1.5 rounded text-sm text-white"
            style={{ backgroundColor: "var(--gekko-black)", border: "1px solid var(--gekko-border)" }}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2 py-1.5 rounded text-sm text-white"
            style={{ backgroundColor: "var(--gekko-black)", border: "1px solid var(--gekko-border)" }}
          >
            <option value="">All Priorities</option>
            {PRIORITY_OPTIONS.filter(Boolean).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Done toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "rgba(255,255,255,0.7)" }}>
            <input
              type="checkbox"
              checked={includeDone}
              onChange={(e) => setIncludeDone(e.target.checked)}
              style={{ accentColor: "var(--gekko-green)" }}
            />
            Show completed
          </label>

          {/* Bulk mode */}
          <button
            onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
            className="px-2.5 py-1.5 rounded text-xs font-semibold transition-all"
            style={{
              backgroundColor: bulkMode ? "rgba(0,255,65,0.15)" : "rgba(255,255,255,0.07)",
              color: bulkMode ? "var(--gekko-green)" : "rgba(255,255,255,0.7)",
              border: bulkMode ? "1px solid var(--gekko-green-border)" : "1px solid transparent",
            }}
          >
            Bulk Mode {bulkMode && `(${selectedIds.size})`}
          </button>
        </div>
      )}

      {/* URL filter clear */}
      {urlFilter && (
        <button
          onClick={() => window.history.pushState({}, "", "/tasks")}
          className="flex items-center gap-1.5 text-sm"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <X size={13} /> Clear filter
        </button>
      )}

      {/* Tasks */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
          <Loader2 size={16} className="animate-spin" />
          Loading tasks...
        </div>
      ) : !tasks || tasks.length === 0 ? (
        <div
          className="p-10 rounded-lg text-center"
          style={{ backgroundColor: "var(--gekko-card)", border: "1px solid var(--gekko-border)" }}
        >
          <CheckSquare size={32} className="mx-auto mb-3" style={{ color: "rgba(255,255,255,0.3)" }} />
          <p className="text-white font-semibold">No tasks found</p>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
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
