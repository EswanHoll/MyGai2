import { useState } from "react";
import { Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import QuickTaskModal from "./QuickTaskModal";

/**
 * Floating Action Button — always visible in the bottom-right corner.
 * Opens the QuickTaskModal to create a new task in the Task Tracker.
 */
export default function QuickTaskFAB() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all duration-200"
            style={{
              backgroundColor: "var(--gekko-green)",
              color: "#000",
              boxShadow: "0 0 20px rgba(0,255,65,0.35), 0 4px 12px rgba(0,0,0,0.4)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.08)";
              e.currentTarget.style.boxShadow = "0 0 28px rgba(0,255,65,0.5), 0 6px 16px rgba(0,0,0,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 0 20px rgba(0,255,65,0.35), 0 4px 12px rgba(0,0,0,0.4)";
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.95)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1.08)";
            }}
            aria-label="Create quick task"
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="left"
          style={{
            backgroundColor: "var(--gekko-card)",
            border: "1px solid var(--gekko-border)",
            color: "white",
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          Quick Task (add to Task Tracker)
        </TooltipContent>
      </Tooltip>

      <QuickTaskModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
