---
title: 'Fix UI Automation Locator and Failure-State Contracts'
type: 'bugfix'
created: '2026-09-24'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Four Playwright checks fail because export options are not consistently exposed as menu items, Forms and Policies tab names are matched with brittle lowercase exact locators, and Salary Slip assumes a download exists after loading even when the application renders an error or empty state.

**Approach:** Use assertion-backed tolerant export-option locators for both affected page objects and their download actions, make Forms and Policies tab matching case-insensitive, and explicitly distinguish Salary Slip error/empty states from successful report loading while leaving workflow failure propagation unchanged.

</frozen-after-approval>

## Implementation Notes

- Added assertion-backed export option fallbacks in both page objects and reused those locators for download clicks.
- Preserved Separation's valid empty state when no exportable requests exist.
- Made Forms and Policies tab names case-insensitive while preserving their button-role contract.
- Added an explicit Salary Slip error/empty-state branch before requiring a download action.
- Focused execution exposed an independent application defect: Forms and Policies `ViewPolicyFile` returns HTTP 404, so the document action correctly remains failing rather than being hidden by the locator fix.
- Review tightened generic export fallbacks to visible matches, waits for Separation's export-or-empty state to settle, and verifies Policies content after switching tabs.
- Final focused execution passed Loans, Advance, Salary Slip, and Separation; Claims passed when rerun alone after one application-side popup render failure where no export options entered the accessibility tree.

## Review Triage Log

- medium, deferred -- Perform's beta guard ignores a possible BASE_URL override; recorded in `deferred-work.md` because the user required the staged Perform work to remain untouched.
- medium, deferred -- Perform cannot repair a partially created primary KPI; recorded for the separate Perform workflow.
- medium, deferred -- Perform does not look up an existing exact-name cycle before creation; recorded for the separate Perform workflow.
- high, deferred -- Perform accepts configuration states other than LOCKED without proving they are mutable drafts; recorded for the separate Perform workflow.
- high, deferred -- Perform reapplies KPI templates without checking existing goals; recorded for the separate Perform workflow.
- medium, deferred -- Perform parses every successful response as JSON and cannot handle 204; recorded for the separate Perform workflow.
- medium, deferred -- Perform screen checks do not prove seeded records are displayed; recorded for the separate Perform workflow.
- medium, deferred -- Perform uses a fixed cycle window that will expire; recorded for the separate Perform workflow.
- medium, deferred -- the dedicated Perform command filters out its untagged safeguard tests; recorded for the separate Perform workflow.
- medium, deferred -- Perform documentation and completion state exceed verified execution; recorded for the separate Perform workflow.
- medium, patched -- generic export text could resolve a hidden duplicate; restricted fallback matching to visible text and preferred semantic buttons.
- medium, patched -- Separation checked export existence before async content settled; now waits for either export or the explicit empty state.
- low, patched -- Policies switching only rechecked button visibility; now verifies the Policy Name content.
- low, rejected -- the scenario inventory document is outside this bug fix and updating a binary artifact is disproportionate.
- low, rejected -- generated tutorial files are unrelated, untracked user content and were not modified.
- low, rejected -- the Office lock file is unrelated transient user content and was not modified.
