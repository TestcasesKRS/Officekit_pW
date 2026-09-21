#!/usr/bin/env node
// Usage: node run-user-dashboard-tests.js --sleep=2000

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
  OfficeKit HR - EMPLOYEE DASHBOARD VALIDATION
==================================================================
  Environment : https://betatesting.officekithr.net/login
  Browser     : Chromium (${project === 'headed' ? 'visible/headed' : 'headless'})
  Pause/step  : ${sleepTime}ms

  PRECONDITION
  1. Log in with Employee credentials from environment variables
  2. Verify Employee dashboard opens at /

  FLOW 1 - EMPLOYEE SHELL AND PERMISSIONS
  1. Verify Athul greeting, profile, and Junior Software Engineer role
  2. Verify Dashboard, Perform, and Task navigation
  3. Verify permitted Employee sidebar modules

  FLOW 2 - EMPLOYEE DASHBOARD CONTENT
  1. Verify Total Hours
  2. Verify Request and Approvals, Reports, My Team, and Feeds
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
    `npx playwright test user-dashboard.spec.ts --project=${project} --reporter=list`,
    {
      cwd: path.dirname(__filename),
      env: { ...process.env, SLEEP_TIME: sleepTime },
      stdio: 'inherit',
    },
  );
} catch {
  process.exitCode = 1;
}
