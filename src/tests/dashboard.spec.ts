import { expect, test } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginCredentials, LoginPage } from '../pages/LoginPage';
import { requiredEnvironmentVariable } from '../utils/environment';
import { captureScreen } from '../utils/screenshots';

const sleepTime = Number(process.env.SLEEP_TIME ?? 0);
const admin: LoginCredentials = {
  companyCode: requiredEnvironmentVariable('COMPANY_CODE'),
  username: requiredEnvironmentVariable('ADMIN_USERNAME'),
  password: requiredEnvironmentVariable('ADMIN_PASSWORD'),
};

test.describe('OfficeKit HR Admin dashboard flows @dashboard', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page, sleepTime);
    dashboardPage = new DashboardPage(page, sleepTime);

    await test.step('Precondition - log in as Admin', async () => {
      await loginPage.login(admin);
      await expect(page).toHaveURL(/\/hr-dashboard(?:\/|$)/);
      await expect(dashboardPage.dashboardLink).toBeVisible();
    });
  });

  test.describe('Flow 1 - Dashboard shell @dashboard-smoke', () => {
    test('displays the authenticated user header and primary navigation', async () => {
      await test.step('Verify the user greeting and profile', async () => {
        await expect(dashboardPage.greeting).toBeVisible();
        await expect(dashboardPage.userProfileButton).toBeVisible();
      });

      await test.step('Verify direct navigation links', async () => {
        await expect(dashboardPage.dashboardLink).toBeVisible();
        await expect(dashboardPage.performLink).toBeVisible();
        await expect(dashboardPage.taskButton).toBeVisible();
        await expect(dashboardPage.aiInsightButton).toBeVisible();
      });

      await test.step('Verify expandable sidebar modules', async () => {
        const modules = [
          'My Profile',
          'Company',
          'Attendance',
          'Leave',
          'Payroll',
          'Resolve',
          'TalentHub',
          'Settings',
        ];

        for (const module of modules) {
          await expect(dashboardPage.sidebarButton(module)).toBeVisible();
        }
      });

      await captureScreen(dashboardPage.page, 'admin-dashboard', 'shell-and-navigation');
    });
  });

  test.describe('Flow 2 - Dashboard widgets @dashboard-widgets', () => {
    test('displays all summary metrics', async () => {
      const metrics = [
        'Total Hours',
        'Total Employee',
        'On Leave',
        'New Joiners',
        'Employee Exit',
      ];

      for (const metric of metrics) {
        await test.step(`Verify summary metric: ${metric}`, async () => {
          await expect(dashboardPage.summaryMetric(metric)).toBeVisible();
        });
      }

      await captureScreen(dashboardPage.page, 'admin-dashboard', 'summary-metrics');
    });

    test('displays the main dashboard sections', async () => {
      await test.step('Verify Attendance Summary', async () => {
        await expect(dashboardPage.attendanceSummary).toBeVisible();
      });

      await test.step('Verify Request & Approvals', async () => {
        await expect(dashboardPage.requestsAndApprovals).toBeVisible();
      });

      await test.step('Verify My Team', async () => {
        await expect(dashboardPage.myTeam).toBeVisible();
      });

      await test.step('Verify Feeds', async () => {
        await expect(dashboardPage.feeds).toBeVisible();
      });

      await captureScreen(dashboardPage.page, 'admin-dashboard', 'main-sections');
    });

    test('loads all quick-access functions and shows the active cards', async () => {
      const allFunctions = [
        'Leave',
        'Attendance',
        'Payroll',
        'Forms & Policies',
        'My Holidays',
        'Organization',
      ];

      await test.step('Verify all six carousel functions are loaded', async () => {
        for (const functionName of allFunctions) {
          await expect(dashboardPage.quickAccessHeading(functionName)).toBeAttached();
        }
      });

      await test.step('Verify the three initially active cards are visible', async () => {
        for (const functionName of ['Leave', 'Attendance', 'Organization']) {
          await expect(dashboardPage.quickAccessCard(functionName)).toBeVisible();
        }
      });

      await captureScreen(dashboardPage.page, 'admin-dashboard', 'quick-access-cards');
    });
  });

  test.describe('Flow 3 - Sidebar navigation @dashboard-navigation', () => {
    test('Perform opens the Performance Management page', async ({ page }) => {
      await test.step('Click Perform', async () => {
        await dashboardPage.clickPerform();
      });
      await expect(page).toHaveURL(/\/pms(?:\/|$)/);
      await captureScreen(page, 'pms', 'admin-pms-page');
    });

    test('Task opens the task timesheet page', async ({ page }) => {
      await test.step('Click Task', async () => {
        await dashboardPage.clickTask();
      });
      await expect(page).toHaveURL(/\/task-timesheet(?:\/|$)/);
      await captureScreen(page, 'task', 'admin-task-timesheet');
    });
  });

  test.describe('Flow 4 - Quick-access navigation @dashboard-navigation', () => {
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
      test(`${navigationCase.card} card opens its destination page`, async ({ page }) => {
        await test.step(`Click ${navigationCase.card} quick-access card`, async () => {
          await dashboardPage.clickQuickAccessCard(navigationCase.card);
        });
        await test.step('Verify destination URL', async () => {
          await expect(page).toHaveURL(navigationCase.expectedUrl);
        });
        await captureScreen(
          page,
          navigationCase.card.toLowerCase(),
          `admin-${navigationCase.card.toLowerCase()}-page`,
        );
      });
    }
  });

  test.describe('Flow 5 - Header actions @dashboard-header', () => {
    test('opens notifications and displays Inbox management actions', async () => {
      await test.step('Open the notification dialog', async () => {
        await dashboardPage.openNotifications();
        await expect(dashboardPage.notificationDialog).toBeVisible();
      });

      await test.step('Verify Inbox and notification management controls', async () => {
        await expect(dashboardPage.notificationInboxTab).toBeVisible();
        await expect(dashboardPage.notificationTodoTab).toBeVisible();
        await expect(dashboardPage.clearNotificationsButton).toBeVisible();
        await expect(dashboardPage.markAllNotificationsReadButton).toBeVisible();
      });

      await captureScreen(dashboardPage.page, 'admin-dashboard', 'notifications-inbox');
    });

    test('switches between notification tabs and closes the dialog', async () => {
      await dashboardPage.openNotifications();

      await test.step('Open My To Do List', async () => {
        await dashboardPage.notificationTodoTab.click();
        await expect(dashboardPage.notificationTodoTab).toHaveClass(/border-blue-600/);
        await expect(dashboardPage.clearNotificationsButton).toBeHidden();
        await expect(dashboardPage.markAllNotificationsReadButton).toBeHidden();
      });

      await test.step('Return to Inbox', async () => {
        await dashboardPage.notificationInboxTab.click();
        await expect(dashboardPage.notificationInboxTab).toHaveClass(/border-blue-600/);
        await expect(dashboardPage.clearNotificationsButton).toBeVisible();
      });

      await test.step('Close the notification dialog', async () => {
        await dashboardPage.closeNotifications();
        await expect(dashboardPage.notificationDialog).toBeHidden();
      });
    });

    test('opens the profile menu and displays all profile actions', async () => {
      await dashboardPage.openProfileMenu();

      await expect(dashboardPage.profileMenu).toBeVisible();
      await expect(dashboardPage.profileMenu).toContainText('Faizan Lanka');
      await expect(dashboardPage.profileMenu).toContainText('Chief Executive Officer');
      await expect(dashboardPage.myProfileMenuItem).toBeVisible();
      await expect(dashboardPage.changePasswordMenuItem).toBeVisible();
      await expect(dashboardPage.logoutMenuItem).toBeVisible();

      await captureScreen(dashboardPage.page, 'admin-dashboard', 'profile-menu');
    });

    test('My Profile opens personal information', async ({ page }) => {
      await dashboardPage.openProfileMenu();
      await dashboardPage.myProfileMenuItem.click();

      await expect(page).toHaveURL(/\/my-profile\/personal-info(?:\/|$)/);
      await expect(
        page.getByText(`EMP/M2H/${admin.username}`, { exact: true }).first(),
      ).toBeVisible();
      await captureScreen(page, 'my-profile', 'admin-personal-information');
    });

    test('Change Password validates entries without updating the password', async ({ page }) => {
      await dashboardPage.openProfileMenu();
      await dashboardPage.changePasswordMenuItem.click();

      await test.step('Verify the password form', async () => {
        await expect(dashboardPage.changePasswordDialog).toBeVisible();
        await expect(dashboardPage.currentPasswordInput).toBeVisible();
        await expect(dashboardPage.newPasswordInput).toBeVisible();
        await expect(dashboardPage.confirmPasswordInput).toBeVisible();
        await expect(dashboardPage.cancelPasswordChangeButton).toBeVisible();
        await expect(dashboardPage.updatePasswordButton).toBeVisible();
      });

      await test.step('Show and hide the current password', async () => {
        await dashboardPage.changePasswordDialog
          .getByRole('button', { name: 'Show password', exact: true })
          .first()
          .click();
        await expect(dashboardPage.currentPasswordInput).toHaveAttribute('type', 'text');
        await dashboardPage.changePasswordDialog
          .getByRole('button', { name: 'Hide password', exact: true })
          .first()
          .click();
        await expect(dashboardPage.currentPasswordInput).toHaveAttribute('type', 'password');
      });

      await test.step('Reject an empty form', async () => {
        await dashboardPage.updatePasswordButton.click();
        await expect(page.getByText('Please enter your current password.', { exact: true })).toBeVisible();
      });

      await test.step('Reject a weak new password', async () => {
        await dashboardPage.currentPasswordInput.fill(admin.password);
        await dashboardPage.newPasswordInput.fill('newpassword');
        await dashboardPage.confirmPasswordInput.fill('newpassword');
        await dashboardPage.updatePasswordButton.click();
        await expect(
          page.getByText(
            'Password must be at least 8 characters long and include a number and a special character.',
            { exact: true },
          ),
        ).toBeVisible();
      });

      await test.step('Reject non-matching passwords', async () => {
        await dashboardPage.newPasswordInput.fill('Password@123!');
        await dashboardPage.confirmPasswordInput.fill('Different@123!');
        await dashboardPage.updatePasswordButton.click();
        await expect(
          page.getByText('New password and confirm password do not match.', { exact: true }),
        ).toBeVisible();
      });

      await captureScreen(page, 'my-profile', 'change-password-validation');

      await test.step('Cancel without changing the password', async () => {
        await dashboardPage.cancelPasswordChangeButton.click();
        await expect(dashboardPage.changePasswordDialog).toBeHidden();
      });
    });

    test('Log Out returns to the login page', async ({ page }) => {
      await dashboardPage.openProfileMenu();
      await dashboardPage.logoutMenuItem.click();

      await expect(page).toHaveURL(/\/login(?:\/|$)/);
      await expect(page.locator('#login-company-code')).toBeVisible();
    });
  });
});
