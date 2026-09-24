- source_spec: none
  summary: Implement the destructive Employee Separation request and Approver approval workflow as the final Profile automation suite.
  evidence: Separation can remove the configured Employee and invalidate the credentials required by the independently testable Loans, Advances, and Claims workflows.
- source_spec: none
  summary: Cover Claims administrative workflows for Proxy, Reports, Configuration, and Anomaly Review.
  evidence: These administrative workspaces are independently shippable and may mutate shared Claims configuration, so they should follow the core request-to-approval lifecycle.
- source_spec: none
  summary: Complete destructive Separation submission, approval/rejection, and withdrawal lifecycle automation.
  evidence: Separation can deactivate the configured Employee and must execute only after all financial and administrative scenarios are complete.
- source_spec: `_bmad-output/implementation-artifacts/spec-my-profile-language-lifecycle.md`
  summary: Preserve My Profile mutation screenshots and browser artifacts in a durable evidence store.
  evidence: Current screenshot and test-results paths may be ignored or replaced; confirm retention requirements and a target store before treating them as durable review evidence.
- source_spec: `_bmad-output/implementation-artifacts/spec-fix-forms-policies-download-test.md`
  summary: Surface monitored API failures when an expected browser download never starts.
  evidence: The download timeout currently rejects before the test calls `assertNoFailures()`, so the directly actionable HTTP 404 is captured but omitted from the primary failure output.
- source_spec: `_bmad-output/implementation-artifacts/spec-fix-ui-automation-contracts.md`
  summary: Validate the resolved application origin before allowing Perform demo-data mutations.
  evidence: The beta-only guard checks TEST_ENV but BASE_URL can override it with a non-beta tenant.
- source_spec: `_bmad-output/implementation-artifacts/spec-fix-ui-automation-contracts.md`
  summary: Make primary Perform framework creation recover from a pillar-created/KPI-missing partial run.
  evidence: A rerun skips repair once the pillar budget totals 1000 points, leaving the missing KPI unrecoverable.
- source_spec: `_bmad-output/implementation-artifacts/spec-fix-ui-automation-contracts.md`
  summary: Reuse an existing exact-name Perform demo cycle before creating another one.
  evidence: The allowed-creation branch does not search for an existing demo cycle and can duplicate it on rerun.
- source_spec: `_bmad-output/implementation-artifacts/spec-fix-ui-automation-contracts.md`
  summary: Restrict Perform demo assignments and goals to an explicitly mutable draft cycle.
  evidence: The current guard accepts every blocking configuration state except LOCKED, including potentially finalized states.
- source_spec: `_bmad-output/implementation-artifacts/spec-fix-ui-automation-contracts.md`
  summary: Prove KPI template seeding is idempotent before applying it on every Perform demo rerun.
  evidence: The workflow does not inspect existing employee goals before calling the template endpoint again.
- source_spec: `_bmad-output/implementation-artifacts/spec-fix-ui-automation-contracts.md`
  summary: Support successful no-content responses in the Perform demo API helper.
  evidence: Every successful response is parsed as JSON, so a 204 would be reported as failure after its mutation completed.
- source_spec: `_bmad-output/implementation-artifacts/spec-fix-ui-automation-contracts.md`
  summary: Verify seeded Perform records on each target screen instead of checking headings and absent empty-state text.
  evidence: Loading, error, or unrelated populated states can currently satisfy the screen checks.
- source_spec: `_bmad-output/implementation-artifacts/spec-fix-ui-automation-contracts.md`
  summary: Derive a valid future Perform demo cycle window rather than using fixed 2026-2027 dates.
  evidence: The hard-coded cycle will expire and eventually be rejected or create stale demo data.
- source_spec: `_bmad-output/implementation-artifacts/spec-fix-ui-automation-contracts.md`
  summary: Include Perform safeguard tests in the dedicated demo-data command.
  evidence: The command filters for @performance-demo-data, but the safeguard describe block lacks that tag.
- source_spec: `_bmad-output/implementation-artifacts/spec-fix-ui-automation-contracts.md`
  summary: Align Perform demo documentation and completion status with verified connected-data execution.
  evidence: The README and spec claim completed connected data even though a known blocking cycle prevents assignments, goals, and screen verification.
