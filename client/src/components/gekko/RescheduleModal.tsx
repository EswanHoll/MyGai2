import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";

interface RescheduleModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (datetime: string) => void;
  taskName: string;
  loading?: boolean;
}

export default function RescheduleModal({
  open,
  onClose,
  onConfirm,
  taskName,
  loading = false,
}: RescheduleModalProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");

  useEffect(() => {
    if (open) {
      // Default to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().substring(0, 10));
      setTime("09:00");
    }
  }, [open]);

  const handleConfirm = () => {
    if (!date) return;
    const dt = new Date(`${date}T${time}:00`);
    onConfirm(dt.toISOString());
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-sm"
        style={{
          backgroundColor: "var(--gekko-card)",
          border: "1px solid var(--gekko-border)",
          color: "white",
          fontFamily: "'Nunito', sans-serif",
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white font-bold">
            <Calendar size={18} style={{ color: "var(--gekko-green)" }} />
            Reschedule Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div
            className="px-3 py-2 rounded text-sm"
            style={{ backgroundColor: "rgba(0,255,65,0.06)", border: "1px solid var(--gekko-green-border)" }}
          >
            <span style={{ color: "rgba(255,255,255,0.6)" }}>Task: </span>
            <span className="font-semibold text-white">{taskName}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white text-sm font-semibold flex items-center gap-1">
                <Calendar size={13} /> Date
              </Label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded text-sm text-white"
                style={{
                  backgroundColor: "var(--gekko-black)",
                  border: "1px solid var(--gekko-border)",
                  fontFamily: "'Nunito', sans-serif",
                  colorScheme: "dark",
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white text-sm font-semibold flex items-center gap-1">
                <Clock size={13} /> Time
              </Label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded text-sm text-white"
                style={{
                  backgroundColor: "var(--gekko-black)",
                  border: "1px solid var(--gekko-border)",
                  fontFamily: "'Nunito', sans-serif",
                  colorScheme: "dark",
                }}
              />
            </div>
          </div>

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
              disabled={loading || !date}
              className="font-bold"
              style={{ backgroundColor: "var(--gekko-green)", color: "#000" }}
            >
              {loading ? "Saving..." : "Reschedule"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
