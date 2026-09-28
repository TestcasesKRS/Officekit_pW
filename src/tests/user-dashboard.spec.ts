import { expect, test } from '@playwright/test';
import { LoginCredentials, LoginPage } from '../pages/LoginPage';
import { UserDashboardPage } from '../pages/UserDashboardPage';
import { requiredEnvironmentVariable } from '../utils/environment';
import { captureScreen } from '../utils/screenshots';

const sleepTime = Number(process.env.SLEEP_TIME ?? 0);
const employee: LoginCredentials = {
  companyCode: requiredEnvironmentVariable('COMPANY_CODE'),
  username: requiredEnvironmentVariable('EMPLOYEE_USERNAME'),
  password: requiredEnvironmentVariable('EMPLOYEE_PASSWORD'),
};

test.describe('OfficeKit HR Employee dashboard flows @user-dashboard', () => {
  let dashboardPage: UserDashboardPage;

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page, sleepTime);
    dashboardPage = new UserDashboardPage(page, sleepTime);

    await test.step('Precondition - log in as Employee', async () => {
      await loginPage.login(employee);
      await expect(page).toHaveURL(/officekithr\.net\/$/, { timeout: 15000 });
      await dashboardPage.dashboardLink.waitFor({ state: 'visible', timeout: 10000 });
      await expect(dashboardPage.dashboardLink).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Flow 1 - Employee dashboard shell @user-dashboard-smoke', () => {
    test('displays Employee identity and permitted navigation', async () => {
      await test.step('Verify Employee greeting and profile', async () => {
        await expect(dashboardPage.greeting).toBeVisible();
        await expect(dashboardPage.userProfileButton).toBeVisible();
      });

      await test.step('Verify direct navigation links', async () => {
        await expect(dashboardPage.dashboardLink).toBeVisible();
        await expect(dashboardPage.performLink).toBeVisible();
        await expect(dashboardPage.taskButton).toBeVisible();
        await expect(dashboardPage.aiInsightButton).toBeVisible();
      });

      await test.step('Verify Employee sidebar permissions', async () => {
        const modules = [
          'My Profile',
          'Attendance',
          'Leave',
          'Settings',
        ];
        for (const module of modules) {
          await expect(dashboardPage.sidebarButton(module)).toBeVisible();
        }
        await expect(dashboardPage.sidebarButton('Company')).toHaveCount(0);
        await expect(dashboardPage.sidebarButton('TalentHub')).toHaveCount(0);
      });

      await captureScreen(dashboardPage.page, 'employee-dashboard', 'shell-and-permissions');
    });
  });

  test.describe('Flow 2 - Employee dashboard content @user-dashboard-widgets', () => {
    test('displays Employee widgets and sections', async () => {
      await test.step('Verify Total Hours widget', async () => {
        await expect(dashboardPage.totalHours).toBeVisible();
      });

      await test.step('Verify Employee dashboard sections', async () => {
        await expect(dashboardPage.requestsAndApprovals).toBeVisible();
        await expect(dashboardPage.reports).toBeVisible();
        await expect(dashboardPage.myTeam).toBeVisible();
        await expect(dashboardPage.feeds).toBeVisible();
      });

      await captureScreen(dashboardPage.page, 'employee-dashboard', 'widgets-and-sections');
    });

    test('loads all quick-access functions and shows active cards', async () => {
      const functions = [
        'Leave',
        'Attendance',
        'Payroll',
        'Forms & Policies',
        'My Holidays',
        'Organization',
      ];

      await test.step('Verify all quick-access functions are loaded', async () => {
        for (const functionName of functions) {
          await expect(dashboardPage.quickAccessHeading(functionName)).toBeAttached();
        }
      });

      await test.step('Verify initially active cards', async () => {
        for (const functionName of ['Leave', 'Attendance', 'Organization']) {
          await expect(dashboardPage.quickAccessCard(functionName)).toBeVisible();
        }
      });

      await captureScreen(dashboardPage.page, 'employee-dashboard', 'quick-access-cards');
    });
  });

  test.describe('Flow 3 - Employee sidebar navigation @user-dashboard-navigation', () => {
    test('Perform opens the Performance Management page', async ({ page }) => {
      await dashboardPage.clickPerform();
      await expect(page).toHaveURL(/\/pms(?:\/|$)/);
      await captureScreen(page, 'pms', 'employee-pms-page');
    });

    test('Task opens the task timesheet page', async ({ page }) => {
      await dashboardPage.clickTask();
      await expect(page).toHaveURL(/\/task-timesheet(?:\/|$)/);
      await captureScreen(page, 'task', 'employee-task-timesheet');
    });
  });

  test.describe('Flow 4 - Employee quick-access navigation @user-dashboard-navigation', () => {
    const navigationCases = [
      {
        card: 'Leave',
        expectedUrl: /\/leave\/request-approvals\/leave-application(?:\/|$)/,
      },
      {
        card: 'Attendance',
        expectedUrl: /\/attendance\/request-approvals\/on-duty(?:\/|$)/,
      },
      {
        card: 'Organization',
        expectedUrl: /\/my-profile\/organisation(?:\/|$)/,
      },
    ];

    for (const navigationCase of navigationCases) {
      test(`${navigationCase.card} opens its Employee page`, async ({ page }) => {
        await test.step(`Click ${navigationCase.card}`, async () => {
          await dashboardPage.clickQuickAccessCard(navigationCase.card);
        });
        await expect(page).toHaveURL(navigationCase.expectedUrl);
        await captureScreen(
          page,
          navigationCase.card.toLowerCase(),
          `employee-${navigationCase.card.toLowerCase()}-page`,
        );
      });
    }
  });
});
