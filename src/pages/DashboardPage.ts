import { Locator, Page } from '@playwright/test';

export class DashboardPage {
  readonly dashboardLink: Locator;
  readonly profileButton: Locator;
  readonly userProfileButton: Locator;
  readonly profileMenu: Locator;
  readonly myProfileMenuItem: Locator;
  readonly changePasswordMenuItem: Locator;
  readonly logoutMenuItem: Locator;
  readonly changePasswordDialog: Locator;
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly updatePasswordButton: Locator;
  readonly cancelPasswordChangeButton: Locator;
  readonly notificationButton: Locator;
  readonly notificationDialog: Locator;
  readonly notificationInboxTab: Locator;
  readonly notificationTodoTab: Locator;
  readonly clearNotificationsButton: Locator;
  readonly markAllNotificationsReadButton: Locator;
  readonly greeting: Locator;
  readonly performLink: Locator;
  readonly taskButton: Locator;
  readonly taskTimesheetLink: Locator;
  readonly attendanceSummary: Locator;
  readonly requestsAndApprovals: Locator;
  readonly myTeam: Locator;
  readonly feeds: Locator;
  readonly aiInsightButton: Locator;

  constructor(
    readonly page: Page,
    private readonly sleepTime = 0,
  ) {
    this.dashboardLink = page.getByRole('link', { name: 'Dashboard', exact: true });
    this.profileButton = page.getByRole('button', { name: 'My Profile', exact: true });
    this.userProfileButton = page.getByRole('button', { name: /Faizan Lanka/ });
    this.profileMenu = page.getByRole('menu');
    this.myProfileMenuItem = page.getByRole('menuitem', { name: 'My Profile', exact: true });
    this.changePasswordMenuItem = page.getByRole('menuitem', {
      name: /^Change Password/,
    });
    this.logoutMenuItem = page.getByRole('menuitem', { name: 'Log Out', exact: true });
    this.changePasswordDialog = page.getByRole('dialog', { name: 'Change Password' });
    this.currentPasswordInput = this.changePasswordDialog.locator('#current-password');
    this.newPasswordInput = this.changePasswordDialog.locator('#new-password');
    this.confirmPasswordInput = this.changePasswordDialog.locator('#confirm-password');
    this.updatePasswordButton = this.changePasswordDialog.getByRole('button', {
      name: 'Update Password',
      exact: true,
    });
    this.cancelPasswordChangeButton = this.changePasswordDialog.getByRole('button', {
      name: 'Cancel',
      exact: true,
    });
    this.notificationButton = page.locator('div[type="button"][aria-haspopup="dialog"]');
    this.notificationDialog = page
      .getByRole('heading', { name: 'Notifications', exact: true })
      .locator('xpath=ancestor::*[@role="dialog"]');
    this.notificationInboxTab = this.notificationDialog.getByRole('button', {
      name: /^Inbox/,
    });
    this.notificationTodoTab = this.notificationDialog.getByRole('button', {
      name: /^My To Do List/,
    });
    this.clearNotificationsButton = this.notificationDialog.getByRole('button', {
      name: 'Clear All',
      exact: true,
    });
    this.markAllNotificationsReadButton = this.notificationDialog.getByRole('button', {
      name: 'Mark all as read',
      exact: true,
    });
    this.greeting = page.getByRole('heading', { name: /Good (Morning|Afternoon|Evening), Faizan/ });
    this.performLink = page.getByRole('link', { name: 'Perform', exact: true });
    this.taskButton = page.getByRole('button', { name: 'Task', exact: true });
    this.taskTimesheetLink = page.getByRole('link', { name: 'Task & Timesheet', exact: true });
    this.attendanceSummary = page.getByText('Attendance Summary', { exact: true });
    this.requestsAndApprovals = page.getByText('Request & Approvals', { exact: true }).first();
    this.myTeam = page.getByText('My Team', { exact: true }).first();
    this.feeds = page.getByText('Feeds', { exact: true }).first();
    this.aiInsightButton = page.getByRole('button', { name: 'AI Insight', exact: true });
  }

  private async pause(): Promise<void> {
    if (this.sleepTime > 0) {
      await this.page.waitForTimeout(this.sleepTime);
    }
  }

  sidebarButton(name: string): Locator {
    return this.dashboardLink.locator('xpath=..').getByRole('button', { name, exact: true });
  }

  summaryMetric(name: string): Locator {
    return this.page.getByText(name, { exact: true }).first();
  }

  quickAccessHeading(name: string): Locator {
    return this.page.getByRole('heading', { name, exact: true });
  }

  quickAccessCard(name: string): Locator {
    return this.quickAccessHeading(name).locator(
      'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " carousel-item ")]',
    );
  }

  async clickPerform(): Promise<void> {
    await this.performLink.click();
    await this.pause();
  }

  async clickTask(): Promise<void> {
    await this.taskButton.click();
    await this.taskTimesheetLink.click();
    await this.pause();
  }

  async clickQuickAccessCard(name: string): Promise<void> {
    await this.quickAccessCard(name).click();
    await this.pause();
  }

  async openNotifications(): Promise<void> {
    await this.notificationButton.click();
    await this.pause();
  }

  async closeNotifications(): Promise<void> {
    await this.notificationButton.click();
    await this.pause();
  }

  async openProfileMenu(): Promise<void> {
    await this.userProfileButton.click();
    await this.pause();
  }
}
