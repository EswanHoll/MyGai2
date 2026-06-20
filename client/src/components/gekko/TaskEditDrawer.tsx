/**
 * TaskEditDrawer
 * ──────────────
 * Slide-in edit form for an existing GaiTask.
 * Editable fields: name, priority, notes, project_id, agent_profile.
 * Wired to: trpc.tasks.updateTask mutation.
 *
 * Opened from TaskDetailDrawer via the "Edit" button.
 */

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import AgentTierSelector, { DEFAULT_AGENT_TIER } from "./AgentTierSelector";
import type { GaiTask, AgentProfile } from "../../../../server/gekkodb";

// ─── Priority options ─────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent", color: "#f87171" },
  { value: "high", label: "High", color: "#fb923c" },
  { value: "normal", label: "Normal", color: "#60a5fa" },
  { value: "low", label: "Low", color: "#9ca3af" },
] as const;

type Priority = "urgent" | "high" | "normal" | "low";

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskEditDrawerProps {
  task: GaiTask | null;
  open: boolean;
  onClose: () => void;
  projects?: Array<{ id: string; name: string }>;
  onSaved?: (updated: GaiTask) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TaskEditDrawer({ task, open, onClose, projects = [], onSaved }: TaskEditDrawerProps) {
  const [name, setName] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [notes, setNotes] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [agentProfile, setAgentProfile] = useState<AgentProfile>(DEFAULT_AGENT_TIER);

  const utils = trpc.useUtils();

  // Seed form from task whenever it changes or drawer opens
  useEffect(() => {
    if (task && open) {
      setName(task.name ?? "");
      setPriority((task.priority as Priority) ?? "normal");
      setNotes(task.notes ?? "");
      setProjectId(task.project_id ?? "");
      setAgentProfile((task.agent_profile as AgentProfile) ?? DEFAULT_AGENT_TIER);
    }
  }, [task, open]);

  const updateTask = trpc.tasks.updateTask.useMutation({
    onSuccess: (updated) => {
      toast.success(`Task updated: "${updated.name}"`);
      utils.tasks.getAll.invalidate();
      utils.tasks.getStats.invalidate();
      onSaved?.(updated);
      onClose();
    },
    onError: (err) => {
      toast.error(`Failed to update task: ${err.message}`);
    },
  });

  const handleSave = () => {
    if (!task) return;
    if (!name.trim()) {
      toast.error("Task name is required");
      return;
    }
    updateTask.mutate({
      id: task.id,
      name: name.trim(),
      priority,
      notes: notes.trim() || undefined,
      project_id: projectId || null,
      agent_profile: agentProfile,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleSave();
    }
  };

  if (!task) return null;

  const selectedPriority = PRIORITY_OPTIONS.find((p) => p.value === priority);

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
        onKeyDown={handleKeyDown}
      >
        <SheetHeader className="pb-4" style={{ borderBottom: "1px solid var(--gekko-border)" }}>
          <SheetTitle className="text-white font-bold text-base flex items-center gap-2">
            <Pencil size={16} style={{ color: "var(--gekko-green)" }} />
            Edit Task
          </SheetTitle>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {task.id}
          </p>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {/* Task name */}
          <div className="space-y-1.5">
            <Label className="text-white text-sm font-semibold">
              Task Name <span style={{ color: "#f87171" }}>*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Task name"
              className="text-white placeholder:text-white/40 text-sm"
              style={{
                backgroundColor: "var(--gekko-black)",
                border: "1px solid var(--gekko-border)",
                fontFamily: "'Nunito', sans-serif",
              }}
            />
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label className="text-white text-sm font-semibold">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger
                className="text-sm font-semibold"
                style={{
                  backgroundColor: "var(--gekko-black)",
                  border: "1px solid var(--gekko-border)",
                  color: selectedPriority?.color ?? "white",
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                style={{
                  backgroundColor: "var(--gekko-card)",
                  border: "1px solid var(--gekko-border)",
                }}
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-sm font-semibold"
                    style={{ color: opt.color }}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Agent Tier */}
          <AgentTierSelector
            value={agentProfile}
            onChange={setAgentProfile}
            disabled={updateTask.isPending}
          />

          {/* Project */}
          {projects.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-white text-sm font-semibold">
                Project{" "}
                <span style={{ color: "rgba(255,255,255,0.5)" }}>(optional)</span>
              </Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger
                  className="text-sm font-semibold text-white"
                  style={{
                    backgroundColor: "var(--gekko-black)",
                    border: "1px solid var(--gekko-border)",
                    fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent
                  style={{
                    backgroundColor: "var(--gekko-card)",
                    border: "1px solid var(--gekko-border)",
                  }}
                >
                  <SelectItem value="" className="text-sm font-semibold text-white/60">
                    No project
                  </SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-sm font-semibold text-white">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-white text-sm font-semibold">
              Notes{" "}
              <span style={{ color: "rgba(255,255,255,0.5)" }}>(optional)</span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context, links, or instructions for Gai..."
              rows={4}
              className="resize-none text-white placeholder:text-white/40 text-sm"
              style={{
                backgroundColor: "var(--gekko-black)",
                border: "1px solid var(--gekko-border)",
                fontFamily: "'Nunito', sans-serif",
              }}
            />
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Press{" "}
              <kbd className="px-1 py-0.5 rounded text-xs" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                Ctrl+Enter
              </kbd>{" "}
              to save
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2" style={{ borderTop: "1px solid var(--gekko-border)" }}>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={updateTask.isPending}
              className="text-white border-white/20 hover:bg-white/10 font-semibold"
              style={{ backgroundColor: "transparent" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateTask.isPending || !name.trim()}
              className="font-bold"
              style={{
                backgroundColor: "var(--gekko-green)",
                color: "#000",
              }}
            >
              {updateTask.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
