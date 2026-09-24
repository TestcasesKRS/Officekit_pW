---
title: 'Populate Perform Demo Data Through Automation'
type: 'feature'
created: '2026-09-24'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '2d496b86c1771b257c6dc5ffc591d111f575b6df'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The beta tenant's Perform module lacks enough connected data to demonstrate framework, employee, goal, cycle, and reporting screens. Manual population of at least 50 frameworks and their dependent records is slow and inconsistent.

**Approach:** Add repeatable Playwright automation that creates a clearly named demo dataset in dependency order, assigns employees through a performance cycle, and verifies populated Perform screens without deleting pre-existing tenant data.

## Boundaries & Constraints

**Always:** Target the configured beta tenant; create at least 50 identifiable demo frameworks; make the primary framework total 1000 points with usable KPI data; preserve unrelated records; tag the workflow as mutating; make reruns detect existing demo records; verify the Frameworks, Performance Cycles, Overview/My Performance, Team Overview, Goals, Org-Wide Report, Goal/KPI Report, and Bell Curve screens.

**Never:** Print credentials, tokens, or authorization headers; delete or silently replace pre-existing frameworks, cycles, employee assignments, goals, competency groups, or settings; lock or finalize a shared draft cycle without explicit approval.

**Decisions:** Preserve the existing `test-name` draft and create a separate demo cycle only if the application permits it; assign only the configured employee test account; preserve organization-wide settings while adding clearly named demo competency and recommendation reference data.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Empty demo dataset | Fewer than 50 demo frameworks exist | Create only the missing framework names and complete the primary framework | Fail with the rejected API/UI response and retain already-created valid records |
| Repeat execution | Demo records already exist | Reuse matching records and avoid duplicate names or assignments | Report ambiguous duplicate matches instead of guessing |
| Existing active/draft cycle | Tenant contains `test-name` or another cycle | Follow the approved cycle strategy and preserve unrelated assignments | Stop before cycle mutation if the observed state differs from the approved strategy |
| Assignment | Approved employees are available | Assign each selected employee to the primary demo framework | Report unavailable employees and do not substitute silently |

</frozen-after-approval>

## Code Map

- `src/fixtures/auth.fixture.ts` -- reuse isolated admin authentication and session cleanup.
- `src/pages/LoginPage.ts` -- existing credential-safe login flow; do not duplicate credential handling.
- `src/pages/modules/index.ts` -- `PerformancePage` exposes the established Perform navigation label.
- `src/tests/performance-demo-data.spec.ts` -- new mutating, idempotent demo-data workflow and UI verification.
- `package.json` -- add an explicit command so bulk demo seeding never runs in the default non-mutating suite.

## Tasks & Acceptance

**Execution:**
- [x] `src/tests/performance-demo-data.spec.ts` -- create an idempotent admin automation flow for framework seeding, cycle/assignment setup, dependent demo data, and screen verification.
- [x] `package.json` -- add a dedicated `test:performance-demo-data` command that selects only the mutating demo workflow.
- [x] `README.md` -- document environment, side effects, rerun behavior, and the dedicated command.

**Acceptance Criteria:**
- Given valid beta admin credentials and fewer than 50 named demo frameworks, when the dedicated automation runs, then the Framework Library shows at least 50 demo frameworks and the primary framework has exactly 1000 points with a KPI.
- Given the approved cycle and employee strategy, when assignments are created, then every selected employee appears in the cycle roster with the primary framework.
- Given cycle assignments and authored goals, when the automation visits each Perform screen, then each applicable screen shows the seeded cycle, employee, goal, or report data instead of its empty state.
- Given the same automation is run again, when matching demo records already exist, then it reuses them without creating duplicate framework names or duplicate employee assignments.
- Given a conflicting cycle or ambiguous duplicate is detected, when the automation reaches that mutation, then it stops with an actionable error and does not delete existing data.

## Implementation Notes

One complete framework, `Demo Framework 01 - Engineering Excellence`, was created during UI discovery with built-in Attendance and Learning & Development pillars plus an 800-point Role Excellence pillar and KPI. A draft cycle named `test-name` appeared concurrently after the initial cycle screen had shown no active cycle; it currently contains two frameworks and six employee assignments, so cycle mutation is blocked pending a human decision.

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm run typecheck` -- expected: TypeScript succeeds without errors.
- `npm run test:list` -- expected: Playwright collects the new tagged workflow.
- `npm run test:performance-demo-data` -- expected: the approved beta demo dataset is created/reused and all target screen assertions pass.
