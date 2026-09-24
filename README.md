# OfficeKit Playwright Tests

Playwright TypeScript test automation for OfficeKit using Page Objects, reusable role fixtures, and environment-aware configuration.

## Test Suites

- Login validation
- Admin dashboard validation and navigation
- Employee dashboard validation and navigation
- Calendar, employee filters, and application journey forms
- Full-page screenshots grouped by module

## Local Setup

Install dependencies and Chromium:

```bash
npm ci
npx playwright install chromium
```

Set these environment variables before running tests:

```text
TEST_ENV=beta
BASE_URL=
COMPANY_CODE
ADMIN_USERNAME
ADMIN_PASSWORD
EMPLOYEE_USERNAME
EMPLOYEE_PASSWORD
```

`TEST_ENV` supports `beta`, `staging`, and `production`. Beta and production have built-in URLs;
staging requires `BASE_URL`. `BASE_URL` can override the selected environment for any run. Keep
environment-specific credentials in ignored files such as `.env.beta` or inject them through the shell/CI.

## Reusable Fixtures

Import `test` and `expect` from `src/fixtures/auth.fixture.ts`. Tests can request `adminSession`,
`employeeSession`, or call `loginAs(role)` for isolated browser contexts. `modulesFor(page)` returns typed
page scaffolds for Employee Management, Attendance, Leave, Shift, Payroll, Recruitment, Performance,
Reports, Settings, and Roles and Permissions. Existing Login and Dashboard page objects are exported from
`src/pages/modules/index.ts`.

```ts
import { expect, test } from '../fixtures/auth.fixture';

test('employee can open Attendance', async ({ employeeSession, modulesFor }) => {
  const modules = modulesFor(employeeSession.page);
  await modules.attendance.open();
  await expect(modules.attendance.heading()).toBeVisible();
});
```

Financial lifecycle tests additionally require the eligible Employee above and both sequential
financial Approver accounts:

```text
FINANCIAL_APPROVER_1_USERNAME
FINANCIAL_APPROVER_1_PASSWORD
FINANCIAL_APPROVER_2_USERNAME
FINANCIAL_APPROVER_2_PASSWORD
```

Run all tests headlessly:

```bash
npm test
```

Framework validation and CI-equivalent execution:

```bash
npm run typecheck
npm run test:list
npm run test:ci
```

Run headed tests with readable delays:

```bash
npm run test:headed
```

Individual suites:

```bash
npm run test:login
npm run test:dashboard
npm run test:user-dashboard
npm run test:calendar
```

The default `npm test` command excludes every `@mutating` test. Run financial requests separately,
after confirming the Employee is eligible for all three modules and the two Approvers are configured
in that order:

```bash
npm run test:financial-requests
npm run test:financial-requests -- --grep @financial-lifecycle
npm run test:my-profile
npm run test:my-profile:mutating
```

Run only one focused financial suite at a time. Each lifecycle execution creates and retains three
records per module: one Approved, one rejected by the first Approver, and one rejected by the second
Approver. Set `FINANCIAL_LIFECYCLE_RUN_ID` to a unique value when a stable marker is needed across a
manual retry; never reuse that value for concurrent runs.

### Perform demo data

The Perform demo-data workflow is beta-only and intentionally excluded from `npm test` by its
`@mutating` tag. It requires the base admin and employee environment variables listed above. Run it
only when the configured employee account is the employee intended for the demo:

```bash
npm run test:performance-demo-data
```

The command creates or reuses 50 deterministically named `Demo Framework` records, completes the
primary Engineering Excellence framework to exactly 1000 points with KPI data, and adds clearly named
competency and recommendation reference records. If no cycle blocks creation, it creates a separate
`Demo Performance Cycle - Engineering Excellence` draft, assigns only the configured employee, seeds
that employee's KPI goals, and verifies the Perform framework, cycle, employee, team, goal, reporting,
and bell-curve screens.

Reruns reuse exact-name matches and the existing employee assignment. Ambiguous duplicate names or
assignments fail instead of guessing. Existing non-demo cycles, including `test-name`, are never
changed, locked, finalized, deleted, or replaced; a blocking cycle causes an actionable failure after
safe independent records have been retained. Do not run this command concurrently against the same
tenant.

The My Profile command runs the non-mutating regression dry run for Personal Info, Requests &
Approvals, Forms and Policies, My Holidays, HR Forms & Policies, News Feeds, Surveys & Feedbacks,
Organisation, Letter, and Salary Slip. Screenshots are written to `screenshots/my-profile-dry-run/`;
the latest functional result is documented in `_bmad-output/test-artifacts/my-profile-dry-run-report.md`.
The separately tagged mutating command updates Personal Email, verifies the saved value after reload,
and restores the exact baseline in a `finally` block. Do not run it concurrently against the same employee.

## GitHub Actions

The workflow is stored at `.github/workflows/playwright.yml`. Add the five base environment variables
above as repository Actions secrets under **Settings > Secrets and variables > Actions**. Lifecycle
Approver secrets are intentionally not required because CI uses the non-mutating default command.

Manual workflow runs can select beta, staging, or production and supply a URL override. CI type-checks and
validates test collection before execution. HTML reports, JUnit output, module screenshots, traces, videos,
and failure screenshots are uploaded as artifacts. Playwright retains screenshots, videos, and traces for
every failed test.

## QA Reporting And Integrations

CI writes Playwright JSON to `test-results/results.json` and converts it into `reports/summary.json`,
`reports/summary.html`, and `reports/targets.json`. If Playwright fails before creating JSON, the processor
creates a synthetic configuration/infrastructure failure so reports and notifications still have data. The
summary includes run metadata, timing, totals and percentages, module calculations, typed evidence links,
Jira keys, and verification state. Test IDs are deterministic hashes of project, source file, and resolved
title. A failed test is eligible for a Jira Bug only when its error contains the explicit
`BROKEN FUNCTION` marker emitted by `monitorApplicationFailures`; locator, browser, configuration,
environment, and unknown failures remain report-only.

Canonical integration names are `JIRA_DEFAULT_ASSIGNEE`, `TESTER_EMAIL`, `PROJECT_MANAGER_EMAIL`,
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `EMAIL_FROM`, and
`JIRA_REVIEW_RERUN_MODE=test`; `DEVELOPER_EMAIL` is an optional fallback when Jira does not expose an
assignee email. `JIRA_DEFAULT_ASSIGNEE` must be a Jira Cloud account ID, not a username or email. Configure
`JIRA_BASE_URL`, `JIRA_PROJECT_KEY`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_DEFAULT_ASSIGNEE`, `SMTP_HOST`,
`SMTP_USERNAME`, and `SMTP_PASSWORD` as Actions secrets; configure email recipients, the optional desired
pass transition, `JIRA_EVIDENCE_MAX_BYTES`, and rerun mode as repository variables. `SMTP_USER` remains accepted only as a
compatibility alias for `SMTP_USERNAME`.

Jira processing searches by test ID, module, and failure signature before creating a Bug. Matches receive a
comment; new issues use the configured account ID assignee. Only screenshots below
`JIRA_EVIDENCE_MAX_BYTES` are attached. Trace, video, oversized evidence, report, and summary remain linked
through the workflow run. Jira writes issue and verification metadata back into `reports/summary.json`
before execution, new-defect, or verification emails are sent. Jira and SMTP steps are non-blocking. The
workflow's final result reflects browser installation, configuration, type checking, collection, and Playwright,
so integration failures cannot mask the core automation result.

Useful local commands:

```bash
npm run process:results
npm run validate:config
npm run validate:workflows
npm run test:unit
```

`validate:config` validates defaults without requiring integrations, so it is safe locally. Pass `runtime`
to validate configured integrations, or `jira`, `email`, `webhook`, or `all` to require a specific contract.
Validation reports variable names only and never prints secret values.

## Jira Re-verification Webhook

`webhook/jiraWebhook.ts` is a portable Node HTTP receiver. Host it behind a TLS-terminating reverse proxy;
the receiver itself serves HTTP and does not provision infrastructure or certificates. Expose only
`POST /jira/webhook`, set a strong `JIRA_WEBHOOK_SECRET`, and configure Jira to send the same value in the
`X-Webhook-Secret` header. Also set `GITHUB_OWNER`, `GITHUB_REPO`, a fine-grained `GITHUB_TOKEN` with Actions
write permission, `GITHUB_WORKFLOW`, `GITHUB_REF_NAME`, `TARGET_REGISTRY`, `WEBHOOK_EVENT_STORE`, and
`WEBHOOK_EVENT_TTL_MS`. Restrict ingress to Jira's published addresses where possible and rotate both Jira
and GitHub credentials routinely.

The webhook accepts only `jira:issue_updated` events for `JIRA_PROJECT_KEY` that explicitly transition to
`In Review`. The issue must contain exactly one `pw-...` test ID in its labels or description, and that ID
must resolve uniquely in the deployed `reports/targets.json`. Duplicate change IDs are persisted in a
file-backed TTL store and remain suppressed across receiver restarts. A valid event dispatches
`.github/workflows/jira-reverification.yml` with `jira_issue`, `test_case_id`, and `module`. The workflow
collects current Playwright tests and resolves the deterministic ID at runtime rather than trusting stale
file/title inputs. `JIRA_REVIEW_RERUN_MODE` defaults to one-test mode; module, suite, and full are explicit.
The verification workflow comments on the same issue for pass or fail and never creates another issue. When
`JIRA_PASS_TRANSITION` is configured, it queries available Jira transitions and uses the matching transition;
no transition name is assumed by default.

Operational limitation: deploy the target registry from a recent main workflow run whenever tests are
renamed or moved. The event store is atomic only within one Node process and one local filesystem. Use one
receiver instance, or replace it with a shared transactional store before scaling horizontally.
