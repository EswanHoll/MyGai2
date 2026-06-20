/**
 * AgentTierSelector
 * ─────────────────
 * Reusable selector for the Agent Tier (agent_profile) field.
 * Presents three options: Light, Standard, Max.
 * Default: Standard (manus-1.6).
 *
 * Used in: QuickTaskModal (create), TaskEditDrawer (edit).
 */

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { AgentProfile } from "../../../../server/gekkodb";

// ─── Option definitions ───────────────────────────────────────────────────────

export const AGENT_TIER_OPTIONS: {
  value: AgentProfile;
  label: string;
  model: string;
  tooltip: string;
  color: string;
}[] = [
  {
    value: "manus-1.6-lite",
    label: "Light",
    model: "manus-1.6-lite",
    tooltip: "Light = simple / bounded tasks",
    color: "#9ca3af",
  },
  {
    value: "manus-1.6",
    label: "Standard",
    model: "manus-1.6",
    tooltip: "Standard = most execution tasks",
    color: "#60a5fa",
  },
  {
    value: "manus-1.6-max",
    label: "Max",
    model: "manus-1.6-max",
    tooltip: "Max = complex builds and architecture work",
    color: "#a78bfa",
  },
];

export const DEFAULT_AGENT_TIER: AgentProfile = "manus-1.6";

// ─── Component ────────────────────────────────────────────────────────────────

interface AgentTierSelectorProps {
  value: AgentProfile;
  onChange: (value: AgentProfile) => void;
  disabled?: boolean;
}

export default function AgentTierSelector({ value, onChange, disabled = false }: AgentTierSelectorProps) {
  const selected = AGENT_TIER_OPTIONS.find((o) => o.value === value) ?? AGENT_TIER_OPTIONS[1];

  return (
    <div className="space-y-1.5">
      {/* Label row with tooltip */}
      <div className="flex items-center gap-1.5">
        <Label className="text-white text-sm font-semibold">Agent Tier</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              tabIndex={-1}
              className="inline-flex items-center justify-center rounded-full transition-colors"
              style={{ color: "rgba(255,255,255,0.4)", lineHeight: 1 }}
              aria-label="Agent Tier information"
            >
              <Info size={13} />
            </button>
          </TooltipTrigger>
          <TooltipContent
            style={{
              backgroundColor: "var(--gekko-card)",
              border: "1px solid var(--gekko-border)",
              color: "white",
              maxWidth: "260px",
              fontSize: "12px",
              lineHeight: "1.5",
            }}
          >
            <div className="space-y-1">
              <p className="font-bold text-xs uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>
                Agent Tier
              </p>
              {AGENT_TIER_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-start gap-1.5">
                  <span className="font-bold text-xs shrink-0" style={{ color: opt.color }}>
                    {opt.label}
                  </span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                    — {opt.tooltip.split("= ")[1]}
                  </span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Selector */}
      <Select
        value={value}
        onValueChange={(v) => onChange(v as AgentProfile)}
        disabled={disabled}
      >
        <SelectTrigger
          className="text-sm font-semibold"
          style={{
            backgroundColor: "var(--gekko-black)",
            border: "1px solid var(--gekko-border)",
            color: selected.color,
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
          {AGENT_TIER_OPTIONS.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="text-sm font-semibold"
              style={{ color: opt.color }}
            >
              <span className="font-bold">{opt.label}</span>
              <span className="ml-1.5 text-xs font-normal" style={{ color: "rgba(255,255,255,0.45)" }}>
                ({opt.model})
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
