import { trpc } from "@/lib/trpc";
import { useState, useCallback } from "react";
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import type { GaiTask } from "../../../server/gekkodb";

export default function PublishQueue() {
  const utils = trpc.useUtils();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch all tasks including done
  const { data: allTasks, isLoading } = trpc.tasks.getAll.useQuery(
    { include_done: true },
    { refetchOnWindowFocus: false }
  );

  const { data: projects } = trpc.tasks.getProjects.useQuery();

  // Filter to publish queue items
  const publishItems = (allTasks ?? []).filter(
    (t) => (t.publish_ready || (t.status === "done" && t.agent_type === "worker_agent")) && !t.published
  );

  const markPublished = trpc.tasks.markPublished.useMutation({
    onSuccess: () => {
      utils.tasks.getAll.invalidate();
      toast.success("Marked as published");
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await utils.tasks.getAll.invalidate();
    setTimeout(() => setIsRefreshing(false), 600);
  }, [utils]);

  const getProjectName = (task: GaiTask) =>
    task.project_id ? projects?.find((p) => p.id === task.project_id)?.name ?? task.project_id : "—";

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Upload size={22} style={{ color: "var(--gekko-green)" }} />
            Publish Queue
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
            Webdev deployments ready to publish
          </p>
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

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
          <Loader2 size={16} className="animate-spin" />
          Loading publish queue...
        </div>
      ) : publishItems.length === 0 ? (
        <div
          className="p-12 rounded-lg text-center"
          style={{ backgroundColor: "var(--gekko-card)", border: "1px solid var(--gekko-border)" }}
        >
          <CheckCircle2 size={40} className="mx-auto mb-3" style={{ color: "var(--gekko-green)" }} />
          <p className="text-white font-bold text-lg">No deployments pending publish</p>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
            All worker agent deliverables have been published.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {publishItems.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-4 p-4 rounded-lg"
              style={{ backgroundColor: "var(--gekko-card)", border: "1px solid var(--gekko-border)" }}
            >
              {/* Task info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm truncate">{task.name}</span>
                  {task.manus_task_id && (
                    <a
                      href={`https://manus.im/app/${task.manus_task_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--gekko-green)" }}
                      title="Open in Manus"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <span>Project: {getProjectName(task)}</span>
                  <span>Completed: {new Date(task.updated_at).toLocaleDateString()}</span>
                  {task.agent_type && <span>Agent: {task.agent_type}</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {task.manus_task_id && (
                  <a
                    href={`https://manus.im/app/${task.manus_task_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all"
                    style={{
                      backgroundColor: "rgba(0,255,65,0.15)",
                      color: "var(--gekko-green)",
                      border: "1px solid var(--gekko-green-border)",
                    }}
                  >
                    <ExternalLink size={12} />
                    Publish Now →
                  </a>
                )}
                <button
                  onClick={() => markPublished.mutate({ id: task.id })}
                  disabled={markPublished.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all"
                  style={{
                    backgroundColor: "rgba(74,222,128,0.12)",
                    color: "#4ade80",
                    border: "1px solid rgba(74,222,128,0.25)",
                  }}
                >
                  <CheckCircle2 size={12} />
                  Mark Published
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
