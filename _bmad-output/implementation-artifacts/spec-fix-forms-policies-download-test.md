---
title: 'Harden Forms and Policies download test'
type: 'bugfix'
created: '2026-09-21'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Forms and Policies test times out while waiting for a browser download and selects its document row by a brittle table index.

**Approach:** Verify the download control is visible and enabled, wait up to 15 seconds for the download while clicking it, and select the first row that actually contains an accessible download button. Preserve the real-download requirement; the confirmed API 404 must remain visible as an application defect rather than weakening the assertion.

</frozen-after-approval>

## Implementation Notes

- Updated `src/utils/downloads.ts` to assert that the control is actionable and to use an explicit 15-second download-event timeout while preserving click/event concurrency and diagnostic errors.
- Updated `src/tests/my-profile-content.spec.ts` to select the first row containing a download button instead of assuming the second table row is downloadable.
- The application source is not in this repository. Existing evidence shows policy ID 5 returns HTTP 404, so the test intentionally continues to fail until the application data or backend handler is repaired.
- Verification: `npm run typecheck` passed. The targeted Playwright test selected the actionable control and reproduced the expected missing-download failure after the explicit 15-second timeout.

## Review Triage Log

- false -- The shared 15-second timeout is the explicitly requested helper contract and remains longer than the observed 10-second failure; applying it consistently is intentional.
- medium, deferred -- `assertNoFailures()` is not reached after a download timeout, so the captured API 404 is absent from the primary test error. This diagnostic limitation predates the change and is recorded in `deferred-work.md`.
- false -- Keeping the P1 assertion red is required because weakening or quarantining the real-download requirement would hide the confirmed application defect.
- false -- The test-level actionable checks intentionally provide scenario-specific diagnostics before the shared helper enforces its general contract.
- false -- The one-shot spec format intentionally omits a separate Verification section; executed verification evidence is recorded in Implementation Notes, and helper edge-case unit tests are outside this focused change.
