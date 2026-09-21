#!/usr/bin/env node
// Usage:
//   node run-dashboard-tests.js --sleep=2000
//   node run-dashboard-tests.js --sleep=5000

const { execSync } = require('child_process');
const path = require('path');

function argument(name, fallback) {
  const value = process.argv.find((item) => item.startsWith(`${name}=`));
  return value ? value.split('=').slice(1).join('=') : fallback;
}

const sleepTime = argument('--sleep', '3000');
const project = argument('--project', 'headed');

console.log(`
==================================================================
  OfficeKit HR - ADMIN DASHBOARD VALIDATION
==================================================================
  Browser    : Chromium (${project === 'headed' ? 'visible/headed' : 'headless'})
  Pause/step : ${sleepTime}ms

  PRECONDITION
  1. Open /login
  2. Enter Admin Company Code, Username, and Password
  3. Click Sign in
  4. Confirm /hr-dashboard opens

  FLOW 1 - DASHBOARD SHELL
  1. Verify time-based greeting and logged-in Admin profile
  2. Verify Dashboard, Perform, and Task navigation
  3. Verify My Profile, Company, Attendance, Leave, Payroll,
     Resolve, TalentHub, Settings, and AI Insight modules

  FLOW 2 - DASHBOARD WIDGETS
  1. Verify Total Hours, Total Employee, On Leave, New Joiners,
     and Employee Exit metrics
  2. Verify Attendance Summary, Request & Approvals, My Team,
     and Feeds sections
  3. Verify all six quick-access functions are loaded
  4. Verify Leave, Attendance, and Organization active cards

  FLOW 3 - SIDEBAR NAVIGATION
  1. Perform -> /pms
  2. Task & Timesheet -> /task-timesheet

  FLOW 4 - QUICK-ACCESS NAVIGATION
  1. Leave -> /leave/request-approvals/leave-application
  2. Attendance -> /attendance/request-approvals/on-duty
  3. Organization -> /my-profile/organisation
==================================================================
`);

try {
  execSync(
    `npx playwright test dashboard.spec.ts --project=${project} --reporter=list`,
    {
      cwd: path.dirname(__filename),
      env: { ...process.env, SLEEP_TIME: sleepTime },
      stdio: 'inherit',
    },
  );
} catch {
  process.exitCode = 1;
}
