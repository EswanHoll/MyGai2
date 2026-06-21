// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// We use `any` here because the gai schema is external (Supabase) and not
// described by a generated TypeScript type. All row types are manually defined below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

let _client: AnySupabase | null = null;

/**
 * Returns a Supabase client. Use .schema("gai") on each query.
 * Always uses API key auth — never OAuth or CLI login.
 */
export function getGekkoDB(): AnySupabase {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;
    if (!url || !key) {
      throw new Error("[GekkoDB] SUPABASE_URL and SUPABASE_KEY must be set");
    }
    _client = createClient(url, key, {
      auth: { persistSession: false },
    }) as AnySupabase;
  }
  return _client;
}

// ─── Type definitions matching gai schema ────────────────────────────────────

export type TaskStatus = "pending" | "in_progress" | "done" | "cancelled" | "blocked";
export type TaskPriority = "urgent" | "high" | "normal" | "low";
export type EswanAction = "go_ahead" | "hold" | "reschedule" | "cancel";

/** Agent tier that will execute the task. Maps to ops.tasks.agent_profile. */
export type AgentProfile = "manus-1.6-lite" | "manus-1.6" | "manus-1.6-max";

export const AGENT_PROFILE_OPTIONS = [
  { value: "manus-1.6-lite" as AgentProfile, label: "Light", description: "Simple / bounded tasks" },
  { value: "manus-1.6" as AgentProfile, label: "Standard", description: "Most execution tasks" },
  { value: "manus-1.6-max" as AgentProfile, label: "Max", description: "Complex builds and architecture work" },
] as const;

export const DEFAULT_AGENT_PROFILE: AgentProfile = "manus-1.6";

export interface GaiTenantConfig {
  tenant_id: string;
  name: string;
  tier: number; // 1 to 5
  config: Record<string, unknown>;
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
}

export interface GaiTask {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  project_id: string | null;
  delegated_to: string | null;
  agent_type: string | null;
  eswan_action: EswanAction | null;
  eswan_action_at: string | null;
  eswan_notes: string | null;
  rescheduled_to: string | null;
  manus_task_id: string | null;
  notes: string | null;
  publish_ready: boolean | null;
  published: boolean | null;
  /** Agent tier for task execution. TEXT NOT NULL DEFAULT 'manus-1.6'. */
  agent_profile: AgentProfile;
  created_at: string;
  updated_at: string;
}

export interface GaiProject {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: string | null;
  created_at: string;
}

export interface GaiExecutionLog {
  id: string;
  tenant_id: string;
  task_id: string | null;
  action_type: string | null;
  status: string | null;
  message: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface GaiDailyReport {
  id: string;
  tenant_id: string;
  report_date: string;
  content: {
    gmail_highlights?: Array<{ from: string; subject: string }>;
    summary?: Record<string, unknown>;
    [key: string]: unknown;
  };
  created_at: string;
}
