import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Zap } from "lucide-react";

interface QuickTaskModalProps {
  open: boolean;
  onClose: () => void;
}

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent", color: "#f87171" },
  { value: "high", label: "High", color: "#fb923c" },
  { value: "normal", label: "Normal", color: "#60a5fa" },
  { value: "low", label: "Low", color: "#9ca3af" },
] as const;

type Priority = "urgent" | "high" | "normal" | "low";

export default function QuickTaskModal({ open, onClose }: QuickTaskModalProps) {
  const [name, setName] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [notes, setNotes] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const createQuick = trpc.tasks.createQuick.useMutation({
    onSuccess: (task) => {
      toast.success(`Task created: "${task.name}"`, {
        description: "Added to Task Tracker — awaiting your Go Ahead.",
      });
      utils.tasks.getAll.invalidate();
      utils.tasks.getStats.invalidate();
      handleClose();
    },
    onError: (err) => {
      toast.error(`Failed to create task: ${err.message}`);
    },
  });

  useEffect(() => {
    if (open) {
      setName("");
      setPriority("normal");
      setNotes("");
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, [open]);

  const handleClose = () => {
    setName("");
    setPriority("normal");
    setNotes("");
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Task name is required");
      nameRef.current?.focus();
      return;
    }
    createQuick.mutate({
      name: name.trim(),
      priority,
      notes: notes.trim() || undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      handleClose();
    }
  };

  const selectedPriority = PRIORITY_OPTIONS.find((p) => p.value === priority);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-md"
        style={{
          backgroundColor: "var(--gekko-card)",
          border: "1px solid var(--gekko-border)",
          color: "white",
          fontFamily: "'Nunito', sans-serif",
        }}
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white font-bold">
            <Zap size={18} style={{ color: "var(--gekko-green)" }} />
            Quick Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Info banner */}
          <div
            className="px-3 py-2 rounded text-xs"
            style={{ backgroundColor: "rgba(0,255,65,0.06)", border: "1px solid var(--gekko-green-border)" }}
          >
            <span style={{ color: "rgba(255,255,255,0.6)" }}>
              Creates a task in the Task Tracker with status{" "}
            </span>
            <span className="font-bold" style={{ color: "#fbbf24" }}>Pending</span>
            <span style={{ color: "rgba(255,255,255,0.6)" }}> — awaiting your Go Ahead.</span>
          </div>

          {/* Task name */}
          <div className="space-y-1.5">
            <Label className="text-white text-sm font-semibold">
              Task Name <span style={{ color: "#f87171" }}>*</span>
            </Label>
            <Input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What needs to be done?"
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
              rows={3}
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
              to create
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-1">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={createQuick.isPending}
              className="text-white border-white/20 hover:bg-white/10 font-semibold"
              style={{ backgroundColor: "transparent" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createQuick.isPending || !name.trim()}
              className="font-bold"
              style={{
                backgroundColor: "var(--gekko-green)",
                color: "#000",
              }}
            >
              {createQuick.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
