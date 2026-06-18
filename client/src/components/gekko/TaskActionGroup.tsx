import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle, MessageSquare, PauseCircle, Calendar, XCircle } from "lucide-react";
import GoAheadModal from "./GoAheadModal";
import RescheduleModal from "./RescheduleModal";
import type { GaiTask } from "../../../../server/gekkodb";

interface TaskActionGroupProps {
  task: GaiTask;
  onActionComplete?: () => void;
  compact?: boolean;
}

export default function TaskActionGroup({ task, onActionComplete, compact = false }: TaskActionGroupProps) {
  const [goAheadOpen, setGoAheadOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const utils = trpc.useUtils();

  const updateAction = trpc.tasks.updateAction.useMutation({
    onSuccess: () => {
      utils.tasks.getAll.invalidate();
      utils.tasks.getStats.invalidate();
      onActionComplete?.();
    },
    onError: (err) => {
      toast.error(`Action failed: ${err.message}`);
    },
  });

  const handleGoAhead = (notes: string) => {
    updateAction.mutate(
      { id: task.id, eswan_action: "go_ahead", eswan_notes: notes || undefined },
      {
        onSuccess: () => {
          toast.success("Go Ahead sent to Gai");
          setGoAheadOpen(false);
        },
      }
    );
  };

  const handleReply = (notes: string) => {
    updateAction.mutate(
      { id: task.id, eswan_action: "go_ahead", eswan_notes: notes || undefined },
      {
        onSuccess: () => {
          toast.success("Reply sent to Gai");
          setReplyOpen(false);
        },
      }
    );
  };

  const handleHold = () => {
    updateAction.mutate(
      { id: task.id, eswan_action: "hold" },
      {
        onSuccess: () => toast.success("Task placed on hold"),
      }
    );
  };

  const handleReschedule = (datetime: string) => {
    updateAction.mutate(
      { id: task.id, eswan_action: "reschedule", rescheduled_to: datetime },
      {
        onSuccess: () => {
          toast.success("Task rescheduled");
          setRescheduleOpen(false);
        },
      }
    );
  };

  const handleCancel = () => {
    if (!window.confirm(`Cancel task "${task.name}"?`)) return;
    updateAction.mutate(
      { id: task.id, eswan_action: "cancel" },
      {
        onSuccess: () => toast.success("Task cancelled"),
      }
    );
  };

  const btnBase = compact
    ? "flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-all duration-150 disabled:opacity-50"
    : "flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-all duration-150 disabled:opacity-50";

  const isLoading = updateAction.isPending;

  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Go Ahead */}
        <button
          onClick={() => setGoAheadOpen(true)}
          disabled={isLoading}
          className={btnBase}
          style={{ backgroundColor: "rgba(0,255,65,0.15)", color: "var(--gekko-green)", border: "1px solid var(--gekko-green-border)" }}
          title="Go Ahead"
        >
          <CheckCircle size={13} />
          {!compact && "Go Ahead"}
        </button>

        {/* Reply */}
        <button
          onClick={() => setReplyOpen(true)}
          disabled={isLoading}
          className={btnBase}
          style={{ backgroundColor: "rgba(96,165,250,0.12)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.25)" }}
          title="Reply / Feedback to Gai"
        >
          <MessageSquare size={13} />
          {!compact && "Reply"}
        </button>

        {/* Hold */}
        <button
          onClick={handleHold}
          disabled={isLoading}
          className={btnBase}
          style={{ backgroundColor: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}
          title="Hold"
        >
          <PauseCircle size={13} />
          {!compact && "Hold"}
        </button>

        {/* Reschedule */}
        <button
          onClick={() => setRescheduleOpen(true)}
          disabled={isLoading}
          className={btnBase}
          style={{ backgroundColor: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)" }}
          title="Reschedule"
        >
          <Calendar size={13} />
          {!compact && "Reschedule"}
        </button>

        {/* Cancel */}
        <button
          onClick={handleCancel}
          disabled={isLoading}
          className={btnBase}
          style={{ backgroundColor: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)" }}
          title="Cancel"
        >
          <XCircle size={13} />
          {!compact && "Cancel"}
        </button>
      </div>

      <GoAheadModal
        open={goAheadOpen}
        onClose={() => setGoAheadOpen(false)}
        onConfirm={handleGoAhead}
        taskName={task.name}
        mode="go_ahead"
        loading={isLoading}
      />

      <GoAheadModal
        open={replyOpen}
        onClose={() => setReplyOpen(false)}
        onConfirm={handleReply}
        taskName={task.name}
        mode="reply"
        loading={isLoading}
      />

      <RescheduleModal
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        onConfirm={handleReschedule}
        taskName={task.name}
        loading={isLoading}
      />
    </>
  );
}
