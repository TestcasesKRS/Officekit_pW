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
