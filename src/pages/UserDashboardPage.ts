import { Locator, Page } from '@playwright/test';

export class UserDashboardPage {
  readonly dashboardLink: Locator;
  readonly performLink: Locator;
  readonly taskButton: Locator;
  readonly taskTimesheetLink: Locator;
  readonly greeting: Locator;
  readonly userProfileButton: Locator;
  readonly totalHours: Locator;
  readonly requestsAndApprovals: Locator;
  readonly reports: Locator;
  readonly myTeam: Locator;
  readonly feeds: Locator;
  readonly aiInsightButton: Locator;

  constructor(
    readonly page: Page,
    private readonly sleepTime = 0,
  ) {
    this.dashboardLink = page.getByRole('link', { name: 'Dashboard', exact: true });
    this.performLink = page.getByRole('link', { name: 'Perform', exact: true });
    this.taskButton = page.getByRole('button', { name: 'Task', exact: true });
    this.taskTimesheetLink = page.getByRole('link', { name: 'Task & Timesheet', exact: true });
    this.greeting = page.getByRole('heading', {
      name: /Good (Morning|Afternoon|Evening),\s*\S+/,
    });
    this.userProfileButton = page.getByRole('button', { name: /^Profile\s+\S+/ });
    this.totalHours = page.getByText('Total Hours', { exact: true });
    this.requestsAndApprovals = page.getByText('Request and Approvals', { exact: true });
    this.reports = page.getByText('Reports', { exact: true }).first();
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
}
