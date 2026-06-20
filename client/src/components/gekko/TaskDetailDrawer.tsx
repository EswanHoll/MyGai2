import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ExternalLink, Pencil } from "lucide-react";
import { StatusBadge, PriorityBadge } from "./Badges";
import TaskActionGroup from "./TaskActionGroup";
import TaskEditDrawer from "./TaskEditDrawer";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import type { GaiTask } from "../../../../server/gekkodb";
import { AGENT_TIER_OPTIONS } from "./AgentTierSelector";

interface TaskDetailDrawerProps {
  task: GaiTask | null;
  open: boolean;
  onClose: () => void;
  projectName?: string;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.45)" }}>
        {label}
      </div>
      <div className="text-sm text-white">{value}</div>
    </div>
  );
}

/** Render a human-friendly Agent Tier label from the stored agent_profile value. */
function AgentTierBadge({ profile }: { profile: string | null | undefined }) {
  if (!profile) return null;
  const opt = AGENT_TIER_OPTIONS.find((o) => o.value === profile);
  if (!opt) return <span className="text-sm text-white">{profile}</span>;
  return (
    <span className="text-sm font-bold" style={{ color: opt.color }}>
      {opt.label}{" "}
      <span className="font-normal text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
        ({opt.model})
      </span>
    </span>
  );
}

export default function TaskDetailDrawer({ task, open, onClose, projectName }: TaskDetailDrawerProps) {
  const [editOpen, setEditOpen] = useState(false);
  const { data: projects } = trpc.tasks.getProjects.useQuery(undefined, { enabled: open });

  if (!task) return null;

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleString();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="right"
          className="w-[420px] sm:w-[480px] overflow-y-auto"
          style={{
            backgroundColor: "var(--gekko-card)",
            borderLeft: "1px solid var(--gekko-border)",
            color: "white",
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          <SheetHeader className="pb-4" style={{ borderBottom: "1px solid var(--gekko-border)" }}>
            <div className="flex items-start justify-between gap-2 pr-6">
              <SheetTitle className="text-white font-bold text-base leading-snug flex-1">
                {task.name}
                {task.manus_task_id && (
                  <a
                    href={`https://manus.im/app/${task.manus_task_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center ml-2 align-middle"
                    style={{ color: "var(--gekko-green)" }}
                    title="Open in Manus"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </SheetTitle>
              {/* Edit button */}
              <button
                onClick={() => setEditOpen(true)}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150"
                style={{
                  backgroundColor: "rgba(255,255,255,0.07)",
                  border: "1px solid var(--gekko-border)",
                  color: "rgba(255,255,255,0.75)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--gekko-green)";
                  e.currentTarget.style.color = "var(--gekko-green)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--gekko-border)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                }}
                title="Edit task"
              >
                <Pencil size={11} />
                Edit
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
            </div>
          </SheetHeader>

          <div className="py-4 space-y-4">
            {/* Description */}
            {task.description && (
              <div
                className="p-3 rounded text-sm text-white"
                style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid var(--gekko-border)" }}
              >
                {task.description}
              </div>
            )}

            {/* Core fields */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Delegated To" value={task.delegated_to} />
              <Field label="Agent Type" value={task.agent_type} />
              <Field label="Project" value={projectName ?? task.project_id} />
              <Field label="Eswan Action" value={task.eswan_action} />
              <Field label="Action At" value={formatDate(task.eswan_action_at)} />
              <Field label="Rescheduled To" value={formatDate(task.rescheduled_to)} />
              <Field label="Created" value={formatDate(task.created_at)} />
              <Field label="Updated" value={formatDate(task.updated_at)} />
              {/* Agent Tier — spans full width for readability */}
              <div className="col-span-2 space-y-0.5">
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Agent Tier
                </div>
                <AgentTierBadge profile={task.agent_profile} />
              </div>
            </div>

            {/* Notes */}
            {task.notes && (
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Notes
                </div>
                <div
                  className="p-3 rounded text-sm text-white whitespace-pre-wrap"
                  style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid var(--gekko-border)" }}
                >
                  {task.notes}
                </div>
              </div>
            )}

            {/* Eswan notes */}
            {task.eswan_notes && (
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Eswan's Instructions
                </div>
                <div
                  className="p-3 rounded text-sm text-white whitespace-pre-wrap"
                  style={{ backgroundColor: "rgba(0,255,65,0.05)", border: "1px solid var(--gekko-green-border)" }}
                >
                  {task.eswan_notes}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2" style={{ borderTop: "1px solid var(--gekko-border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>
                Actions
              </div>
              <TaskActionGroup task={task} onActionComplete={onClose} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit drawer — stacked on top of detail drawer */}
      <TaskEditDrawer
        task={task}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        projects={projects ?? []}
      />
    </>
  );
}
