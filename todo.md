# GekkoFlow Command Centre — Build TODO

## Phase 1: Project Setup & Secrets
- [x] Add SUPABASE_URL and SUPABASE_KEY as project secrets
- [x] Install @supabase/supabase-js dependency
- [x] Configure Nunito font in client/index.html
- [x] Set up GekkoFlow design tokens in client/src/index.css (dark theme, brand colours)
- [x] Set ThemeProvider to dark mode

## Phase 2: GekkoDB Integration & tRPC Routers
- [x] Create server/routers/tasks.ts with getAll, getStats, updateAction, getProjects
- [x] Create server/routers/brief.ts with getByDate, availableDates
- [x] Wire routers into server/routers.ts
- [x] Create GekkoDB Supabase client helper (server/gekkodb.ts)

## Phase 3: DashboardLayout & Navigation
- [x] Customise DashboardLayout with GekkoFlow brand colours and Nunito font
- [x] Nav items in exact order: Overview, Gai Daily Brief, Task Dashboard, Publish Queue
- [x] Publish Queue nav badge showing pending publish count
- [x] Scroll to top on nav item click

## Phase 4: Shared Components
- [x] StatTile — clickable tile with count, label, navigates to /tasks with filter param
- [x] GoAheadModal — optional instructions input, Ctrl+Enter shortcut, confirm button
- [x] RescheduleModal — date/time picker
- [x] TaskActionGroup — Go Ahead, Reply, Hold, Reschedule, Cancel buttons
- [x] TaskDetailDrawer — right-side sheet with full task details
- [x] Status badges (pending=yellow, in_progress=blue, done=green, cancelled=grey, blocked=red)
- [x] Priority badges (urgent=red, high=orange, normal=blue, low=grey)
- [x] Manus external link icon (ExternalLink from lucide-react)

## Phase 5: Overview Page (/)
- [x] 4 stat tiles row at top (Awaiting Action, Urgent, In Progress, Done Today)
- [x] Two-column layout: Gai Daily Brief (left) + Action Required (right)
- [x] Gai Daily Brief section — collapsible with chevron on LEFT, localStorage persist
- [x] Action Required section — collapsible with chevron on LEFT, localStorage persist
- [x] Task rows: name (truncated + tooltip), priority badge, delegated_to, manus link, action buttons
- [x] GoAheadModal integration
- [x] Refresh Data button (top right, spinning animation)

## Phase 6: Gai Daily Brief Page (/brief)
- [x] Date picker for historical briefs
- [x] Collapsible sections: Summary Stats, Eswan's Actions Today, Completed Tasks, In Progress, Blocked, Awaiting Decision, Delegated Logs, Error Logs, Gmail Highlights
- [x] Default to today's date

## Phase 7: Task Dashboard Page (/tasks)
- [x] Filter bar: status, priority, search by name
- [x] URL query param filters: ?filter=awaiting|urgent|in_progress|done_today
- [x] Done tasks hidden by default with toggle
- [x] Bulk Mode toggle for multi-select actions
- [x] Task rows with all fields, action buttons, manus link
- [x] Task Detail Drawer on task name click
- [x] Group by project (collapsible), Unassigned group
- [x] Refresh Data button

## Phase 8: Publish Queue Page (/publish)
- [x] List tasks where publish_ready=true or fallback (status=done, agent_type=worker_agent)
- [x] Each item: task name, project, completion date, manus worker link
- [x] Publish Now → button (opens manus.im/app/{manus_task_id} in new tab)
- [x] Mark as Published button
- [x] Empty state message
- [x] Sidebar badge count for pending publish items

## Phase 9: Vitest Tests
- [x] tasks.getStats returns correct counts
- [x] tasks.updateAction updates correct fields
- [x] tasks.getAll filters work correctly
- [x] brief.getByDate returns expected structure
- [x] Auth: protected procedures reject unauthenticated requests
- [x] Run pnpm test — all pass (26/26)

## Phase 10: Final Polish & Checkpoint
- [x] Visual review — no grey text on dark bg, all badges correct
- [x] Responsive layout check (flex-wrap on stat tiles)
- [x] Save checkpoint: "GekkoFlow Command Centre — Clean Build v1 — all 4 pages + 5 features"
