import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { CheckCircle, MessageSquare } from "lucide-react";

interface GoAheadModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  taskName: string;
  mode?: "go_ahead" | "reply";
  loading?: boolean;
}

export default function GoAheadModal({
  open,
  onClose,
  onConfirm,
  taskName,
  mode = "go_ahead",
  loading = false,
}: GoAheadModalProps) {
  const [notes, setNotes] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setNotes("");
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  const handleConfirm = () => {
    onConfirm(notes);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleConfirm();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  const isReply = mode === "reply";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
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
            {isReply ? (
              <>
                <MessageSquare size={18} style={{ color: "var(--gekko-green)" }} />
                Reply / Feedback to Gai
              </>
            ) : (
              <>
                <CheckCircle size={18} style={{ color: "var(--gekko-green)" }} />
                Go Ahead
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Task context */}
          <div
            className="px-3 py-2 rounded text-sm"
            style={{ backgroundColor: "rgba(0,255,65,0.06)", border: "1px solid var(--gekko-green-border)" }}
          >
            <span style={{ color: "rgba(255,255,255,0.6)" }}>Task: </span>
            <span className="font-semibold text-white">{taskName}</span>
          </div>

          {/* Instructions input */}
          <div className="space-y-1.5">
            <Label className="text-white text-sm font-semibold">
              {isReply ? "Message to Gai" : "Instructions to Gai"}{" "}
              <span style={{ color: "rgba(255,255,255,0.5)" }}>(optional)</span>
            </Label>
            <Textarea
              ref={textareaRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isReply
                  ? "Type your feedback or reply..."
                  : "Any specific instructions for Gai..."
              }
              rows={4}
              className="resize-none text-white placeholder:text-white/40 text-sm"
              style={{
                backgroundColor: "var(--gekko-black)",
                border: "1px solid var(--gekko-border)",
                fontFamily: "'Nunito', sans-serif",
              }}
            />
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Press <kbd className="px-1 py-0.5 rounded text-xs" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>Ctrl+Enter</kbd> to confirm
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-1">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="text-white border-white/20 hover:bg-white/10 font-semibold"
              style={{ backgroundColor: "transparent" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="font-bold"
              style={{
                backgroundColor: "var(--gekko-green)",
                color: "#000",
              }}
            >
              {loading ? "Saving..." : isReply ? "Send Reply" : "Go Ahead"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
