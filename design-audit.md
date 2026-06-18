# GekkoFlow Design Audit — All 4 Pages

## NAV BAR (all pages)
- Icons: BarChart3 for Overview ✓, BookOpen for Daily Brief ✓, CheckSquare for Task Dashboard ✓, Upload for Publish Queue — WRONG (should be Rocket or Send)
- "Gai Daily Brief" label is correct ✓
- Active underline indicator ✓
- Logo icon: Zap ✓ but green bg looks like a button — fine

## OVERVIEW PAGE
Issues:
1. Page title "Command Centre" with lightning bolt — fine but could be "Overview" to match nav
2. Stat tile labels: "AWAITING ACTION", "URGENT", "IN PROGRESS", "DONE TODAY" — all caps looks dated, use Title Case
3. Stat tile icons: AlertCircle-ish (yellow), TrendingUp (red), Clock (blue), CheckCircle (green) — icons are fine
4. "Gai Daily Brief" section header — correct ✓
5. "Action Required" section header — correct ✓
6. Badge "go_ahead" in Eswan's Actions Today — should be "Go Ahead" (human-readable)
7. Badge "cancel" in Eswan's Actions Today — should be "Cancelled"
8. Task row: "→ eswan_approval" delegated_to — should be "Eswan" (human-readable)
9. Task row: "→ gai_strategic" — should be "Gai Strategic"
10. Task row: "→ worker_agent" — should be "Worker Agent"
11. Two-column layout: left column (Brief) is narrower than right (Action Required) — should be 50/50 or Brief slightly wider
12. The Gai Daily Brief section stats (Cycles Run: 0, Delegated: 0) — these are 0 because daily_reports has no data for today, but Completed shows 6. The stats mini-tiles look fine.
13. Gmail Highlights subject lines are ALL CAPS — that's the actual email data, not a display issue
14. Action buttons: all 5 on one row, scrollable — fine but "Go Ahead" green button is the most important, should stand out more

## GAI DAILY BRIEF PAGE
Issues:
1. Page icon: grid/hashtag icon — should be BookOpen or FileText
2. Page title "Gai Daily Brief" ✓
3. Subtitle "Orchestrator activity and task summary" ✓
4. Date tabs "2026-06-18" and "2026-06-17" — should show human-readable "Today" / "Yesterday" for recent dates
5. "Eswan's Actions Today" section: 58 items — the count badge is correct
6. Action badge "go_ahead" → should be "Go Ahead"
7. Action badge "cancel" → should be "Cancelled"  
8. Status badge "In Progress" ✓, "Done" ✓, "Cancelled" ✓
9. "Completed Tasks" section collapsed with count 13 ✓
10. "In Progress" section collapsed with count 12 ✓
11. "Blocked" section collapsed with count 0 ✓
12. "Awaiting Decision" section collapsed with count 5 ✓
13. "Delegated Logs" section collapsed with count 0 ✓
14. "Error Logs" section — "No errors recorded for this date." in green text — should be white/muted
15. "Gmail Highlights" section at bottom ✓
16. The Eswan's Actions Today list is VERY long (58 items) — needs pagination or "show first 20 + expand" 
17. Row text is small and dense — increase line height / padding

## TASK DASHBOARD PAGE  
Issues:
1. Page icon: CheckSquare ✓
2. "Task Dashboard" title ✓
3. Filter bar: "All Statuses", "All Priorities", "Show completed", "Bulk Mode" — fine
4. Task names truncated with "..." — fine, but tooltip on hover needed
5. Group headers: "Unassigned", "Gai Command Center" (appears TWICE — duplicate project name bug), "Gai Command Center Build", "Kruispad", "GekkoFlow Platform", "GekkoTech Brand Identity" (appears TWICE), "GekkoTech" — duplicate groups need fixing
6. Action icon buttons (green circle, chat bubble, orange circle, calendar, red circle) — icon-only, no labels. Need tooltips at minimum.
7. delegated_to values showing raw: "eswan_approval", "gai_strategic", "worker_agent" — should be human-readable
8. Date format "6/18/2026" — should be "18 Jun" or similar shorter format
9. Row density is good ✓
10. "Unassigned" group for tasks with no project — correct ✓

## PUBLISH QUEUE PAGE
Issues:
1. Page icon: Upload ✓ but subtitle "Webdev deployments ready to publish" — slightly narrow scope, should say "Completed deliverables ready for review and publishing"
2. Empty state: "No deployments pending publish" — correct ✓
3. Empty state subtitle: "All worker agent deliverables have been published." — fine ✓
4. The page is mostly empty — when there ARE items, the design needs cards not a table
5. Nav icon for Publish Queue should be Rocket or Send, not Upload

## CROSS-CUTTING ISSUES
1. delegated_to raw values everywhere: eswan_approval → "Eswan", gai_strategic → "Gai", worker_agent → "Worker Agent"
2. eswan_action raw values: go_ahead → "Go Ahead", cancel → "Cancelled", hold → "Hold", reschedule → "Reschedule"
3. Duplicate project groups in Task Dashboard (dedup by project name)
4. Page content padding: all pages need consistent px-6 or px-8 horizontal padding
5. The "Error Logs" green text should be muted/white
