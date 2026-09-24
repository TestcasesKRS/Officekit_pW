import { expect, Locator, Page } from '@playwright/test';

export type SeparationAdminTab =
  | 'Request'
  | 'Proxy'
  | 'Approval'
  | 'Direct Posting'
  | 'Resignation Editing';

export class SeparationPage {
  readonly heading: Locator;
  readonly separationTab: Locator;
  readonly addRequestButton: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly exportButton: Locator;
  readonly requestIds: Locator;
  readonly viewButtons: Locator;
  readonly approversHeading: Locator;
  readonly resignationRequestHeading: Locator;
  readonly approvalWorkflowHeading: Locator;
  readonly cancelButton: Locator;
  readonly submitButton: Locator;
  readonly validationError: Locator;
  readonly duplicateResignationError: Locator;
  readonly noRequestsMessage: Locator;
  readonly requestFormPanel: Locator;
  readonly requestFormComboboxes: Locator;
  readonly remarksInput: Locator;

  constructor(
    readonly page: Page,
    private readonly sleepTime = 0,
  ) {
    this.heading = page.getByRole('heading', { name: 'Request & Approvals', exact: true });
    this.separationTab = page.getByRole('button', { name: 'Separation', exact: true });
    this.addRequestButton = page.getByRole('button', { name: /Add Request$/ }).first();
    this.searchInput = page.getByRole('searchbox', { name: 'Search employee requests' });
    this.statusFilter = page.getByRole('combobox').first();
    this.exportButton = page.getByRole('button', { name: 'Export', exact: true });
    this.requestIds = page.getByText(/^RES-\d+$/, { exact: true });
    this.viewButtons = page.getByRole('button', { name: 'View', exact: true });
    this.approversHeading = page.getByRole('heading', { name: 'Approvers', exact: true });
    this.resignationRequestHeading = page.getByRole('heading', {
      name: 'Resignation Request',
      exact: true,
    });
    this.approvalWorkflowHeading = page.getByRole('heading', {
      name: 'Approval Workflow',
      exact: true,
    });
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true });
    this.submitButton = page.getByRole('button', { name: 'Submit', exact: true });
    this.validationError = page.getByText('Please fill all required fields', { exact: true });
    this.duplicateResignationError = page.getByText('Resignation already exists', { exact: true });
    this.noRequestsMessage = page.getByText('No Request Available!', { exact: true });
    this.requestFormPanel = page.locator('div.fixed.inset-0').last();
    this.requestFormComboboxes = this.requestFormPanel.getByRole('combobox');
    this.remarksInput = this.requestFormPanel.locator('input[type="text"]:not([disabled])');
  }

  private async pause(): Promise<void> {
    if (this.sleepTime > 0) {
      await this.page.waitForTimeout(this.sleepTime);
    }
  }

  adminTab(name: SeparationAdminTab): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  sortButton(column: string): Locator {
    return this.page.getByRole('button', { name: `Sort by ${column}`, exact: true });
  }

  async openFromProfile(): Promise<void> {
    await this.page.getByRole('button', { name: 'My Profile', exact: true }).click();
    await this.page.getByRole('link', { name: 'Requests & Approvals', exact: true }).click();
    await this.heading.waitFor({ state: 'visible' });
    await this.pause();
  }

  async openAdminTab(name: SeparationAdminTab): Promise<void> {
    await this.adminTab(name).click();
    await this.page.waitForURL(/\/my-profile\/request-approvals\/separations\//);
    await this.searchInput.waitFor({ state: 'visible' });
    await this.pause();
  }

  async openStatusFilter(): Promise<void> {
    await this.statusFilter.click();
    await this.pause();
  }

  async selectStatus(status: string): Promise<void> {
    await this.openStatusFilter();
    await this.page.getByRole('option', { name: status, exact: true }).click();
    await this.pause();
  }

  async openFirstApprovers(): Promise<void> {
    await this.viewButtons.first().click();
    await this.approversHeading.waitFor({ state: 'visible' });
    await this.pause();
  }

  async closeFirstApprovers(): Promise<void> {
    await this.page.getByRole('button', { name: 'Hide', exact: true }).first().click();
    await this.pause();
  }

  async openRequestForm(): Promise<void> {
    await this.addRequestButton.click();
    await this.resignationRequestHeading.waitFor({ state: 'visible' });
    await this.pause();
  }

  async completeRequiredRequestFields(remarks: string): Promise<void> {
    await this.requestFormComboboxes.nth(0).click();
    await this.page.getByRole('option', { name: 'RESIGNATION', exact: true }).click();
    await this.requestFormComboboxes.nth(1).click();
    await this.page.getByRole('option', { name: 'PERSONAL ISSUE', exact: true }).click();
    await this.remarksInput.fill(remarks);
    await this.pause();
  }

  exportOption(name: string): Locator {
    const visibleText = this.page
      .getByText(name, { exact: true })
      .and(this.page.locator(':visible'));
    return this.page
      .getByRole('menuitem', { name, exact: true })
      .or(this.page.getByRole('button', { name, exact: true }))
      .or(visibleText)
      .first();
  }

  async openExportMenu(): Promise<void> {
    await expect(this.exportButton).toBeEnabled();
    await this.exportButton.click();
    await expect(this.exportOption('Export as Excel')).toBeVisible({ timeout: 10_000 });
    await this.pause();
  }
}
