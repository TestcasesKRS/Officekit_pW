import { expect, Locator, Page } from '@playwright/test';

export type FinancialModule = 'Loans' | 'Advance' | 'Claims';
export type FinancialWorkspace = 'Request' | 'Approval';
export type FinancialDecision = 'Approve' | 'Reject';
export type FinancialRequestRecovery = {
  requestId?: string;
  onBeforeSubmit: () => Promise<void>;
  onRequestCaptured: (requestId: string) => Promise<void>;
  onSubmitRejected: () => Promise<void>;
};
export type FinancialSubmitOutcome =
  | { status: 'submitted' }
  | { status: 'duplicate'; detail: string }
  | { status: 'failed'; detail: string };

const moduleRoutes: Record<FinancialModule, string> = {
  Loans: 'loan',
  Advance: 'advance',
  Claims: 'claims',
};

export class FinancialRequestsPage {
  readonly heading: Locator;
  readonly addRequestButton: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly exportButton: Locator;
  readonly requestRows: Locator;
  readonly noRequestsMessage: Locator;
  readonly viewButtons: Locator;
  readonly approversHeading: Locator;
  readonly requestFormPanel: Locator;
  readonly approvalWorkflowHeading: Locator;
  readonly cancelButton: Locator;
  readonly submitButton: Locator;
  readonly calculateButton: Locator;
  readonly approvalRemarksInput: Locator;

  constructor(
    readonly page: Page,
    private readonly sleepTime = 0,
  ) {
    this.heading = page.getByRole('heading', { name: 'Request & Approvals', exact: true });
    this.addRequestButton = page.getByRole('button', { name: /Add Request$/ }).first();
    this.searchInput = page.getByRole('searchbox', {
      name: 'Search employee requests',
      exact: true,
    });
    this.statusFilter = page.getByRole('combobox').first();
    this.exportButton = page.getByRole('button', { name: 'Export', exact: true });
    this.requestRows = page.locator('tbody tr');
    this.noRequestsMessage = page.getByText(
      /^(?:No Request Available!|No claim requests found\.|No approval claims found\.)$/,
    );
    this.viewButtons = page.getByRole('button', { name: 'View', exact: true });
    this.approversHeading = page.getByRole('heading', { name: 'Approvers', exact: true });
    this.requestFormPanel = page.locator('div.fixed.inset-0').last();
    this.approvalWorkflowHeading = this.requestFormPanel.getByRole('heading', {
      name: 'Approval Workflow',
      exact: true,
    });
    this.cancelButton = this.requestFormPanel.getByRole('button', {
      name: 'Cancel',
      exact: true,
    });
    this.submitButton = this.requestFormPanel.getByRole('button', {
      name: 'Submit Request',
      exact: true,
    });
    this.calculateButton = this.requestFormPanel.getByRole('button', {
      name: 'Calculate',
      exact: true,
    });
    this.approvalRemarksInput = page.getByPlaceholder('Enter remarks...', { exact: true });
  }

  private async pause(): Promise<void> {
    if (this.sleepTime > 0) {
      await this.page.waitForTimeout(this.sleepTime);
    }
  }

  private async waitForModuleList(module: FinancialModule): Promise<void> {
    await expect(this.moduleButton(module)).toBeVisible();
    await expect.poll(async () => {
      const rows = await this.requestRows.allInnerTexts();
      return (
        rows.some((row) => row.trim().length > 0) ||
        (await this.noRequestsMessage.isVisible())
      );
    }).toBe(true);
  }

  moduleButton(module: FinancialModule): Locator {
    const accessibleModule = this.page
      .getByRole('button', { name: module, exact: true })
      .or(this.page.getByRole('link', { name: module, exact: true }));
    return module === 'Claims'
      ? accessibleModule.or(this.page.getByText(module, { exact: true }).last()).first()
      : accessibleModule.first();
  }

  workspaceTab(workspace: FinancialWorkspace): Locator {
    return this.page.getByRole('button', { name: workspace, exact: true });
  }

  routeFor(module: FinancialModule, workspace: FinancialWorkspace): RegExp {
    if (module === 'Claims') {
      return new RegExp(`/my-profile/claims/${workspace.toLowerCase()}$`);
    }
    return new RegExp(
      `/my-profile/request-approvals/${moduleRoutes[module]}/${workspace.toLowerCase()}$`,
    );
  }

  requestFormHeading(module: FinancialModule): Locator {
    const singular = module === 'Loans' ? 'Loan' : module === 'Claims' ? 'Claims' : module;
    return this.requestFormPanel.getByRole('heading', {
      name: module === 'Claims' ? 'Claims Request' : `New ${singular} Request`,
      exact: true,
    });
  }

  async openFromProfile(): Promise<void> {
    await this.page.getByRole('button', { name: 'My Profile', exact: true }).click();
    await this.page.getByRole('link', { name: 'Requests & Approvals', exact: true }).click();
    await this.heading.waitFor({ state: 'visible' });
    await this.pause();
  }

  async openModule(module: FinancialModule): Promise<void> {
    const listResponse = this.page
      .waitForResponse(
        (response) =>
          module === 'Claims'
            ? response.url().includes('/api/Claims/GetClaimsRequestgrid')
            : response.url().includes('/api/LoanAndAdvance/loan-and-advance-request-retreival'),
        { timeout: 15000 },
      )
      .catch(() => undefined);
    if (module === 'Claims') {
      const directLink = this.page.getByRole('link', { name: module, exact: true });
      if (await directLink.isVisible()) {
        await directLink.click();
      } else {
        await this.page.getByText(module, { exact: true }).last().click();
        await this.page.locator('a[href="/my-profile/claims/request"]').click();
      }
    } else {
      await this.moduleButton(module).click();
    }
    await this.page.waitForURL(this.routeFor(module, 'Request'));
    await listResponse;
    await this.searchInput.waitFor({ state: 'visible' });
    await expect(this.statusFilter).toContainText(module === 'Claims' ? 'All' : 'Pending');
    await this.waitForModuleList(module);
    await this.pause();
  }

  async openWorkspace(module: FinancialModule, workspace: FinancialWorkspace): Promise<void> {
    if (!this.routeFor(module, 'Request').test(this.page.url())) {
      await this.openModule(module);
    }
    if (workspace !== 'Request') {
      await this.workspaceTab(workspace).click();
      await this.page.waitForURL(this.routeFor(module, workspace));
      await this.searchInput.waitFor({ state: 'visible' });
      await expect(this.workspaceTab(workspace)).toHaveClass(/(?:border|bg-blue)/);
      await expect.poll(async () => {
        const rows = await this.requestRows.allInnerTexts();
        return (
          rows.some((row) => row.trim().length > 0) ||
          (await this.noRequestsMessage.isVisible())
        );
      }).toBe(true);
      await this.pause();
    }
  }

  async openStatusFilter(): Promise<void> {
    await this.statusFilter.focus();
    await this.statusFilter.press('Enter');
    await this.page.getByRole('option').first().waitFor({ state: 'visible' });
    await this.pause();
  }

  async selectStatus(status: string): Promise<void> {
    await this.openStatusFilter();
    await this.page
      .getByRole('option')
      .filter({ hasText: new RegExp(`^${status}$`) })
      .click();
    await this.pause();
  }

  async openRequestForm(): Promise<void> {
    await this.addRequestButton.click();
    await this.requestFormPanel.waitFor({ state: 'visible' });
    await this.pause();
  }

  async closeRequestForm(): Promise<void> {
    await this.cancelButton.click();
    await this.requestFormPanel.waitFor({ state: 'hidden' });
  }

  exactRequestRow(requestId: string): Locator {
    return this.requestRows.filter({
      has: this.page.getByRole('button', { name: requestId, exact: true }),
    });
  }

  private async listedRequestIds(): Promise<string[]> {
    const ids: string[] = [];
    for (const row of await this.requestRows.all()) {
      const match = (await row.innerText()).match(/\b[A-Z][A-Z0-9]*-\d+\b/);
      if (match) {
        ids.push(match[0]);
      }
    }
    return ids;
  }

  private async waitForStableList(module: FinancialModule): Promise<void> {
    await this.waitForModuleList(module);
    let previousRows: string | undefined;
    let stableReadings = 0;
    await expect.poll(async () => {
      const rows = JSON.stringify(await this.requestRows.allInnerTexts());
      stableReadings = rows === previousRows ? stableReadings + 1 : 0;
      previousRows = rows;
      return stableReadings;
    }, { intervals: [100, 250, 500] }).toBeGreaterThanOrEqual(2);
  }

  private async fillSearchAndWait(module: FinancialModule, value: string): Promise<void> {
    await this.searchInput.fill(value);
    await expect(this.searchInput).toHaveValue(value);
    await this.waitForStableList(module);
  }

  private async selectStatusAndWait(module: FinancialModule, status: string): Promise<void> {
    await this.selectStatus(status);
    await expect(this.statusFilter).toContainText(status);
    await this.waitForStableList(module);
  }

  private async settlePendingList(module: FinancialModule): Promise<void> {
    if (!(await this.statusFilter.innerText()).includes('Pending')) {
      await this.selectStatusAndWait(module, 'Pending');
    }
    await this.fillSearchAndWait(module, '');
  }

  private async chooseFirstOption(combobox: Locator, field: string): Promise<void> {
    await combobox.click();
    await expect(this.page.getByText('Loading...', { exact: true })).toBeHidden();
    const options = this.page.getByRole('option').filter({ hasNotText: /Loading|No .* available/i });
    await expect.poll(async () => options.count()).toBeGreaterThan(0).catch(() => undefined);
    const optionCount = await options.count();
    if (optionCount === 0) {
      throw new Error(`Financial lifecycle cannot continue: no ${field} is available.`);
    }
    await options.first().click();
  }

  private async requireApprovalWorkflow(module: FinancialModule): Promise<void> {
    const workflowHeading = module === 'Claims'
      ? this.page.getByText('APPROVAL WORKFLOW', { exact: true })
      : this.approvalWorkflowHeading;
    await workflowHeading.waitFor({ state: 'visible' });
    if (await this.page.getByText(/No (?:approvers|workflow)/i).isVisible()) {
      throw new Error(`Financial lifecycle cannot continue: ${module} has no approval workflow.`);
    }
    const workflow = workflowHeading.locator('..');
    const stages = workflow.locator(':scope > div.flex.flex-col.mt-2 > div');
    const structuredStageCount = await stages.count();
    const stageCount = structuredStageCount > 0
      ? structuredStageCount
      : await workflow.getByText(/^\d+$/, { exact: true }).count();
    if (stageCount !== 2) {
      throw new Error(
        `Financial lifecycle requires exactly two sequential ${module} approvers; found ${stageCount}.`,
      );
    }
  }

  private schemeCombobox(): Locator {
    return this.requestFormPanel.getByRole('combobox').first();
  }

  private async readSchemeNames(module: FinancialModule): Promise<string[]> {
    await this.schemeCombobox().click();
    await expect(this.page.getByText('Loading...', { exact: true })).toBeHidden();
    const options = this.page.getByRole('option').filter({ hasNotText: /Loading|No .* available/i });
    const names = (await options.allTextContents()).map((name) => name.trim()).filter(Boolean);
    await this.page.keyboard.press('Escape');
    const unique = [...new Set(names)];
    if (unique.length === 0) {
      throw new Error(`Financial lifecycle cannot continue: no ${module} scheme is available.`);
    }
    return unique;
  }

  private async selectScheme(schemeName: string): Promise<void> {
    const option = this.page.getByRole('option', { name: schemeName, exact: true });
    if (!(await option.isVisible().catch(() => false))) {
      await this.schemeCombobox().click();
      await expect(this.page.getByText('Loading...', { exact: true })).toBeHidden();
    }
    await option.click();
    await this.approvalWorkflowHeading.waitFor({ state: 'visible' });
    await this.page.waitForTimeout(1500);
  }

  private async schemeHasTwoStageWorkflow(): Promise<boolean> {
    let missingReadings = 0;
    for (let attempt = 0; attempt < 20; attempt++) {
      const stages = this.approvalWorkflowHeading
        .locator('..')
        .locator(':scope > div.flex.flex-col.mt-2 > div');
      if ((await stages.count()) === 2) {
        return true;
      }
      if (await this.requestFormPanel.getByText(/No (?:approvers|workflow)/i).isVisible()) {
        missingReadings += 1;
        if (missingReadings >= 2) {
          return false;
        }
      } else {
        missingReadings = 0;
      }
      await this.page.waitForTimeout(500);
    }
    return false;
  }

  private async collectEligibleSchemes(module: FinancialModule): Promise<string[]> {
    const schemeNames = await this.readSchemeNames(module);
    const eligible: string[] = [];
    for (const schemeName of schemeNames) {
      await this.selectScheme(schemeName);
      if (await this.schemeHasTwoStageWorkflow()) {
        eligible.push(schemeName);
      }
    }
    if (eligible.length === 0) {
      throw new Error(
        `Financial lifecycle cannot continue: none of the ${module} schemes (${schemeNames.join(', ')}) has a two-stage approval workflow.`,
      );
    }
    return eligible;
  }

  private async setRangeValue(slider: Locator, value: string): Promise<void> {
    await slider.evaluate((element, targetValue) => {
      const input = element as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      if (setter) {
        setter.call(input, targetValue);
      } else {
        input.value = targetValue;
      }
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
    await expect.poll(async () => slider.inputValue()).toBe(value);
  }

  private async completeLoanOrAdvanceRequest(module: FinancialModule, marker: string): Promise<void> {
    const sanctionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    await this.requestFormPanel.locator('input[type="date"]').fill(sanctionDate);
    await this.requestFormPanel.locator('input[type="text"]').last().fill(marker);
    const sliders = this.requestFormPanel.locator('input[type="range"]');
    if ((await sliders.count()) >= 1) {
      const amountMax = Number((await sliders.nth(0).getAttribute('max')) ?? '0');
      await this.setRangeValue(sliders.nth(0), String(Math.min(10000, amountMax) || amountMax || 1000));
    }
    if ((await sliders.count()) >= 2) {
      const tenureMax = Number((await sliders.nth(1).getAttribute('max')) ?? '0');
      await this.setRangeValue(sliders.nth(1), String(tenureMax || 1));
    }
    await expect(this.calculateButton).toBeEnabled();
    await this.calculateButton.click();
    await expect.poll(async () => this.submitButton.isEnabled()).toBe(true);
    await this.page.waitForTimeout(1000);
    await expect(this.submitButton).toBeEnabled();
  }

  private async captureSubmitResponse(): Promise<
    { status: number; url: string; body: string } | undefined
  > {
    const response = await this.page
      .waitForResponse(
        (candidate) =>
          (candidate.url().includes('/api/LoanAndAdvance') ||
            candidate.url().includes('/api/Claims')) &&
          ['POST', 'PUT', 'PATCH'].includes(candidate.request().method()),
        { timeout: 15000 },
      )
      .catch(() => undefined);
    if (!response) {
      return undefined;
    }
    return {
      status: response.status(),
      url: response.url(),
      body: ((await response.text().catch(() => '')) ?? '').slice(0, 1000),
    };
  }

  private async submitDiagnostics(): Promise<string> {
    const panelText = ((await this.requestFormPanel.innerText().catch(() => '')) ?? '').slice(
      0,
      2000,
    );
    const toast = this.page.locator('.Toastify, [role="status"], [role="alert"], .toast').last();
    const toastText = ((await toast.innerText().catch(() => '')) ?? '').slice(0, 500);
    return `toast=${toastText}. Panel text: ${panelText}`;
  }

  private async submitAndExpectClose(module: FinancialModule, marker: string): Promise<void> {
    const submitButton = module === 'Claims'
      ? this.page.getByRole('button', { name: 'Submit', exact: true })
      : this.submitButton;
    const closeTarget = module === 'Claims'
      ? this.page.getByRole('heading', { name: 'Claims Request', exact: true })
      : this.requestFormPanel;
    await expect(submitButton).toHaveCount(1);
    await submitButton.scrollIntoViewIfNeeded();
    const responsePromise = this.captureSubmitResponse();
    const consoleErrors: string[] = [];
    const consoleListener = (message: { type(): string; text(): string }): void => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    };
    this.page.on('console', consoleListener);
    await submitButton.click();
    const response = await responsePromise;
    this.page.off('console', consoleListener);
    const responseDetail = response
      ? `status=${response.status} url=${response.url} body=${response.body}`
      : 'no LoanAndAdvance/Claims POST/PUT/PATCH response observed';
    const hidden = await closeTarget
      .waitFor({ state: 'hidden', timeout: 30000 })
      .then(() => true)
      .catch(() => false);
    if (!hidden) {
      throw new Error(
        `Financial lifecycle submit did not close the ${module} form for marker ${marker}. ${responseDetail}. console=${consoleErrors.join('|').slice(0, 500)}. ${await this.submitDiagnostics()}`,
      );
    }
  }

  private async submitLoanOrAdvanceForm(
    module: FinancialModule,
    marker: string,
  ): Promise<FinancialSubmitOutcome> {
    await expect(this.submitButton).toHaveCount(1);
    await this.submitButton.scrollIntoViewIfNeeded();
    const responsePromise = this.captureSubmitResponse();
    await this.submitButton.click();
    const response = await responsePromise;
    const responseDetail = response
      ? `status=${response.status} url=${response.url} body=${response.body}`
      : 'no LoanAndAdvance POST/PUT/PATCH response observed';
    const hidden = await this.requestFormPanel
      .waitFor({ state: 'hidden', timeout: 30000 })
      .then(() => true)
      .catch(() => false);
    if (hidden) {
      return { status: 'submitted' };
    }
    if (response && /exists|already|duplicate/i.test(response.body)) {
      return { status: 'duplicate', detail: responseDetail };
    }
    return { status: 'failed', detail: `${responseDetail}. ${await this.submitDiagnostics()}` };
  }

  private async submitLoanOrAdvanceWithSchemeFallback(
    module: FinancialModule,
    marker: string,
    recovery: FinancialRequestRecovery,
  ): Promise<void> {
    const schemes = await this.collectEligibleSchemes(module);
    const duplicates: string[] = [];
    for (const scheme of schemes) {
      await this.selectScheme(scheme);
      await this.completeLoanOrAdvanceRequest(module, marker);
      await recovery.onBeforeSubmit();
      const outcome = await this.submitLoanOrAdvanceForm(module, marker);
      if (outcome.status === 'submitted') {
        return;
      }
      if (outcome.status === 'duplicate') {
        duplicates.push(`${scheme} (${outcome.detail})`);
        await recovery.onSubmitRejected();
        continue;
      }
      throw new Error(
        `Financial lifecycle submit did not close the ${module} form for marker ${marker} under scheme ${scheme}. ${outcome.detail}`,
      );
    }
    throw new Error(
      `Financial lifecycle cannot create a ${module} request for marker ${marker}: every eligible scheme already has an existing request. ${duplicates.join(' | ')}`,
    );
  }

  private async completeClaimRequest(marker: string): Promise<void> {
    const categoryButton = this.page.getByText('Select category', { exact: true });
    const subcategoryButton = this.page.getByText('Select subcategory', { exact: true });
    await this.chooseFirstOption(categoryButton, 'claim category');
    await expect(subcategoryButton).toBeEnabled();
    await this.chooseFirstOption(subcategoryButton, 'claim subcategory');
    await this.page.getByRole('button', { name: 'Add Expense', exact: true }).click();

    const expenseDate = new Date().toISOString().slice(0, 10);
    await this.page.locator('input[type="date"]').last().fill(expenseDate);
    await this.page.locator('input[placeholder="0.00"]').last().fill('100');
    await this.page.locator('textarea').last().fill(marker);
    if (await this.page.getByText('Upload file *', { exact: true }).isVisible()) {
      const uploadResponse = this.page.waitForResponse((response) =>
        response.url().includes('/api/Claims/ConvertFilesToByte'),
      );
      await this.page.locator('input[type="file"]').setInputFiles({
        name: 'financial-lifecycle-receipt.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'),
      });
      if (!(await uploadResponse).ok()) {
        throw new Error('Financial lifecycle could not upload the required claim attachment.');
      }
      await this.page
        .getByText('financial-lifecycle-receipt.pdf', { exact: true })
        .waitFor({ state: 'visible' });
    }
    await this.requireApprovalWorkflow('Claims');
    await expect(this.page.getByRole('button', { name: 'Submit', exact: true })).toBeEnabled();
  }

  async createRequest(
    module: FinancialModule,
    marker: string,
    recovery: FinancialRequestRecovery,
  ): Promise<string> {
    await this.openWorkspace(module, 'Request');
    await this.settlePendingList(module);

    if (recovery.requestId) {
      await this.fillSearchAndWait(module, recovery.requestId);
      const recoveredRow = this.exactRequestRow(recovery.requestId);
      await expect(recoveredRow).toHaveCount(1);
      await expect(recoveredRow).toContainText('Pending');
      return recovery.requestId;
    }

    const beforeIds = new Set(await this.listedRequestIds());

    await this.openRequestForm();
    if (module === 'Claims') {
      await this.completeClaimRequest(marker);
      await recovery.onBeforeSubmit();
      await this.submitAndExpectClose(module, marker);
    } else {
      await this.submitLoanOrAdvanceWithSchemeFallback(module, marker, recovery);
    }
    await this.settlePendingList(module);

    await expect.poll(async () => {
      const currentIds = await this.listedRequestIds();
      return currentIds.filter((id) => !beforeIds.has(id)).length;
    }).toBe(1);
    const matchingIds = (await this.listedRequestIds()).filter((id) => !beforeIds.has(id));
    if (matchingIds.length !== 1) {
      throw new Error(
        `Expected one newly submitted ${module} request for marker ${marker}, found ${matchingIds.length}.`,
      );
    }

    const requestId = matchingIds[0];
    await recovery.onRequestCaptured(requestId);
    await this.fillSearchAndWait(module, requestId);
    await expect(this.exactRequestRow(requestId)).toHaveCount(1);
    await expect(this.exactRequestRow(requestId)).toContainText('Pending');
    return requestId;
  }

  private async prepareClaimSettlement(): Promise<void> {
    const settlement = this.page.getByText('Settlement', { exact: true });
    if (!(await settlement.isVisible())) {
      return;
    }
    const payroll = this.page.getByRole('button', { name: 'Payroll', exact: true });
    if (await payroll.isVisible()) {
      await payroll.click();
    }
    const releaseDate = this.page
      .getByText('Release Date *', { exact: true })
      .locator('..')
      .locator('input[type="date"]');
    if (await releaseDate.isVisible()) {
      await releaseDate.fill(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    }
  }

  async decideRequest(
    module: FinancialModule,
    requestId: string,
    decision: FinancialDecision,
    remarks: string,
  ): Promise<void> {
    await this.openWorkspace(module, 'Approval');
    await this.settlePendingList(module);
    await this.fillSearchAndWait(module, requestId);
    const row = this.exactRequestRow(requestId);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('Pending');

    if (module === 'Claims') {
      const remarksInput = this.page.getByPlaceholder('Add your remarks here', { exact: true });
      await row.getByRole('button', { name: requestId, exact: true }).click();
      await remarksInput.waitFor({ state: 'visible' });
      await remarksInput.fill(remarks);
      if (decision === 'Approve') {
        await this.prepareClaimSettlement();
      }
      const decisionButton = this.page.getByRole('button', { name: decision, exact: true });
      await expect(decisionButton).toHaveCount(1);
      await decisionButton.click();
      await remarksInput.waitFor({ state: 'hidden' });
    } else {
      const checkbox = row.locator('input[type="checkbox"]');
      await expect(checkbox).toHaveCount(1);
      await checkbox.check();
      await this.approvalRemarksInput.fill(remarks);
      await this.page.getByRole('button', { name: decision, exact: true }).click();
    }

    await this.settlePendingList(module);
    await this.fillSearchAndWait(module, requestId);
    await expect(this.exactRequestRow(requestId)).toHaveCount(0);
  }

  async expectRequestStatus(requestId: string, status: 'Approved' | 'Rejected'): Promise<void> {
    const module = (Object.keys(moduleRoutes).find((candidate) => {
      const financialModule = candidate as FinancialModule;
      return this.routeFor(financialModule, 'Request').test(this.page.url()) ||
        this.routeFor(financialModule, 'Approval').test(this.page.url());
    }) ?? '') as FinancialModule;
    if (!module) {
      throw new Error(`Financial lifecycle could not identify the module for request ${requestId}.`);
    }
    await this.selectStatusAndWait(module, status);
    await this.fillSearchAndWait(module, requestId);
    const row = this.exactRequestRow(requestId);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(status);
  }

  async openFirstApprovers(): Promise<void> {
    await this.viewButtons.first().click();
    await this.approversHeading.waitFor({ state: 'visible' });
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
