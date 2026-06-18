import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ExternalLink } from "lucide-react";
import { StatusBadge, PriorityBadge } from "./Badges";
import TaskActionGroup from "./TaskActionGroup";
import type { GaiTask } from "../../../../server/gekkodb";

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

export default function TaskDetailDrawer({ task, open, onClose, projectName }: TaskDetailDrawerProps) {
  if (!task) return null;

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleString();
  };

  return (
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
          <SheetTitle className="text-white font-bold text-base leading-snug pr-6">
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
  );
}
