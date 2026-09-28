---
title: 'Debug Latest Playwright Workflow Failures'
type: 'bugfix'
created: '2026-09-28'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The latest GitHub Actions run reports five Playwright failures. Two are stale dashboard identity/navigation contracts, while three represent application defects but currently surface as generic locator or popup timeouts.

**Approach:** Align dashboard checks with the live permission and identity contracts, scope sidebar controls so dashboard content cannot cause strict-mode collisions, and preserve the red application-defect checks while giving them direct diagnostic messages.

</frozen-after-approval>

## Implementation Notes

- Scoped dashboard module locators to the sidebar container, removing the strict-mode collision with dashboard content buttons.
- Replaced employee-specific identity and title assumptions with the authenticated employee UI contract and aligned permission assertions with the live account.
- Added explicit broken-function diagnostics when financial or separation export menus fail to render.
- Routed a missing Forms and Policies popup through the application-failure monitor, exposing the current `ViewPolicyFile?policyId=17` HTTP 404 as the primary failure.
- Forms and Policies now accepts a popup, browser download, or same-page navigation as a valid document-delivery mechanism, while context-wide API monitoring keeps failed delivery responses red.
- Scoped the document-opening scenario to employee account `10302`, with optional dedicated environment overrides and the standard employee password as its default credential source.
- Verification passed for TypeScript, 16 unit tests, both dashboard smoke scenarios, Loans export, and Separation export. The Forms and Policies scenario intentionally remains red on the confirmed backend 404.

## Review Triage Log

- false -- credential submission determines the configured employee; hardcoding a former employee's display name or title does not prove authentication and caused the observed stale failure.
- medium, patched -- popup API and page errors could escape opener-page monitoring; application failure monitoring now covers every page and API response in the browser context.
- low, patched -- AI Insight is a header control, not a sidebar module; page objects now expose it explicitly and tests assert it with direct navigation controls.
- low, rejected -- adding run metadata to the one-shot implementation spec does not affect the fix, and the run evidence remains in GitHub Actions and the generated QA summary.
- false -- repeated CI export-menu absence is an intermittent application UI failure; successful isolated reruns establish that it is not a permanently stale locator contract.
- low, rejected -- dedicated mocks for Playwright's assertion message are disproportionate; CI evidence exercised the absent-option branch and focused runs exercised successful downloads.
