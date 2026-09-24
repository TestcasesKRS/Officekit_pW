import { expect, test } from '@playwright/test';
import { LoginCredentials, LoginPage } from '../pages/LoginPage';
import { SeparationAdminTab, SeparationPage } from '../pages/SeparationPage';
import { requiredEnvironmentVariable } from '../utils/environment';
import { captureScreen } from '../utils/screenshots';

const sleepTime = Number(process.env.SLEEP_TIME ?? 0);
const employee: LoginCredentials = {
  companyCode: requiredEnvironmentVariable('COMPANY_CODE'),
  username: requiredEnvironmentVariable('EMPLOYEE_USERNAME'),
  password: requiredEnvironmentVariable('EMPLOYEE_PASSWORD'),
};
const admin: LoginCredentials = {
  companyCode: requiredEnvironmentVariable('COMPANY_CODE'),
  username: requiredEnvironmentVariable('ADMIN_USERNAME'),
  password: requiredEnvironmentVariable('ADMIN_PASSWORD'),
};

test.describe('Employee Separation requests @separation @separation-user', () => {
  let separationPage: SeparationPage;

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page, sleepTime);
    separationPage = new SeparationPage(page, sleepTime);

    await loginPage.login(employee);
    await separationPage.openFromProfile();
    await expect(page).toHaveURL(/\/my-profile\/request-approvals\/separations\/request$/);
  });

  test('displays the employee Separation request workspace', async ({ page }) => {
    await expect(separationPage.separationTab).toBeVisible();
    await expect(separationPage.adminTab('Request')).toBeVisible();
    await expect(separationPage.adminTab('Proxy')).toBeHidden();
    await expect(separationPage.addRequestButton).toBeVisible();
    await expect(separationPage.searchInput).toBeVisible();
    await expect(separationPage.statusFilter).toContainText('All');
    await expect(separationPage.exportButton).toBeVisible();

    for (const column of [
      'Request ID',
      'Employee name',
      'Applied On',
      'Requested Date',
      'Approval Status',
      'Approvers',
    ]) {
      await expect(page.getByText(column, { exact: true }).first()).toBeVisible();
    }

    await captureScreen(page, 'separation', 'employee-request-workspace');
  });

  test('offers every request status and filters the list', async ({ page }) => {
    await separationPage.openStatusFilter();

    for (const status of [
      'All',
      'Approved',
      'Pending',
      'Rejected',
      'Withdrawal Pending',
      'Withdrawal Approved',
      'Withdrawal Rejected',
    ]) {
      await expect(page.getByRole('option', { name: status, exact: true })).toBeVisible();
    }

    await page.getByRole('option', { name: 'Pending', exact: true }).click();
    await expect(separationPage.statusFilter).toContainText('Pending');
    await expect(separationPage.requestIds.first().or(separationPage.noRequestsMessage)).toBeVisible();

    await separationPage.selectStatus('All');
    await expect(separationPage.statusFilter).toContainText('All');
  });

  test('searches and sorts employee separation requests', async ({ page }) => {
    await expect(separationPage.requestIds.first()).toBeVisible();
    const firstRequestRow = page.getByRole('row').nth(1);
    const employeeCellText = await firstRequestRow.getByRole('cell').nth(2).innerText();
    const employeeName = employeeCellText.trim().split(/\r?\n/).at(-1);
    expect(employeeName).toBeTruthy();
    const searchTerm = employeeName!.split(/\s+/)[0];

    await separationPage.searchInput.fill(searchTerm);
    await expect(page.getByRole('row').filter({ hasText: searchTerm }).first()).toBeVisible();

    await separationPage.searchInput.clear();
    await separationPage.sortButton('Request ID').click();
    await expect(separationPage.requestIds.first()).toBeVisible();
  });

  test('expands and hides the approver workflow', async ({ page }) => {
    await separationPage.openFirstApprovers();
    await expect(separationPage.approversHeading).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hide', exact: true }).first()).toBeVisible();

    await captureScreen(page, 'separation', 'employee-request-approvers');

    await separationPage.closeFirstApprovers();
    await expect(separationPage.approversHeading).toBeHidden();
  });

  test('exports separation requests as Excel and PDF', async ({ page }) => {
    await expect(
      separationPage.exportButton.or(separationPage.noRequestsMessage),
    ).toBeVisible();
    if (!(await separationPage.exportButton.isVisible())) {
      await expect(separationPage.noRequestsMessage).toBeVisible();
      return;
    }

    for (const exportOption of [
      { name: 'Export as Excel', extension: '.xlsx' },
      { name: 'Export as PDF', extension: '.pdf' },
    ]) {
      await separationPage.openExportMenu();
      const downloadPromise = page.waitForEvent('download');
      await separationPage.exportOption(exportOption.name).click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(
        new RegExp(`^SeparationRequests-\\d{4}-\\d{2}-\\d{2}\\${exportOption.extension}$`),
      );
      expect(await download.failure()).toBeNull();
    }
  });

  test('validates and cancels a resignation request without submitting it', async ({ page }) => {
    await separationPage.openRequestForm();

    for (const field of [
      'Resignation Submission Date',
      'Notice Period',
      'Relieving Date As Per Notice Period',
      'Relieving Type',
      'Reason',
      'Remarks *',
      'Upload Document',
    ]) {
      await expect(page.getByText(field, { exact: true }).first()).toBeVisible();
    }
    await expect(separationPage.approvalWorkflowHeading).toBeVisible();
    await expect(separationPage.cancelButton).toBeVisible();
    await expect(separationPage.submitButton).toBeVisible();

    await separationPage.submitButton.click();
    await expect(separationPage.validationError).toBeVisible();
    await captureScreen(page, 'separation', 'employee-request-validation');

    await separationPage.cancelButton.click();
    await expect(separationPage.resignationRequestHeading).toBeHidden();
  });

  test('submits a complete request and enforces the existing-resignation rule', async ({ page }) => {
    await separationPage.openRequestForm();
    await separationPage.completeRequiredRequestFields(
      `Automated beta separation validation ${Date.now()}`,
    );

    await expect(separationPage.requestFormComboboxes.nth(0)).toContainText('RESIGNATION');
    await expect(separationPage.requestFormComboboxes.nth(1)).toContainText('PERSONAL ISSUE');
    await expect(separationPage.approvalWorkflowHeading).toBeVisible();

    await separationPage.submitButton.click();
    await expect(separationPage.duplicateResignationError).toBeVisible();
    await expect(separationPage.resignationRequestHeading).toBeVisible();
    await captureScreen(page, 'separation', 'employee-duplicate-resignation-guard');

    await separationPage.cancelButton.click();
  });
});

test.describe('Admin Separation approvals @separation @separation-admin', () => {
  let separationPage: SeparationPage;

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page, sleepTime);
    separationPage = new SeparationPage(page, sleepTime);

    await loginPage.login(admin);
    await separationPage.openFromProfile();
    await expect(page).toHaveURL(/\/my-profile\/request-approvals\/separations\/request$/);
  });

  test('displays every admin Separation workflow', async () => {
    for (const tab of [
      'Request',
      'Proxy',
      'Approval',
      'Direct Posting',
      'Resignation Editing',
    ] as SeparationAdminTab[]) {
      await expect(separationPage.adminTab(tab)).toBeVisible();
    }
  });

  const routes: Array<{ tab: SeparationAdminTab; route: string }> = [
    { tab: 'Request', route: 'request' },
    { tab: 'Proxy', route: 'proxy' },
    { tab: 'Approval', route: 'approval' },
    { tab: 'Direct Posting', route: 'direct-posting' },
    { tab: 'Resignation Editing', route: 'resignation-editing' },
  ];

  for (const { tab, route } of routes) {
    test(`${tab} opens its Separation workspace`, async ({ page }) => {
      await separationPage.openAdminTab(tab);
      await expect(page).toHaveURL(new RegExp(`/separations/${route}$`));
      await expect(separationPage.searchInput).toBeVisible();
      if (tab !== 'Resignation Editing') {
        await expect(separationPage.statusFilter).toBeVisible();
      }
      await expect(separationPage.exportButton).toBeVisible();
    });
  }

  test('shows the pending Approval queue or its empty state', async ({ page }) => {
    await separationPage.openAdminTab('Approval');
    await expect(separationPage.statusFilter).toContainText(/Pending|All/);
    await expect(separationPage.noRequestsMessage.or(separationPage.requestIds.first())).toBeVisible();
    await captureScreen(page, 'separation', 'admin-approval-queue');
  });

  test('filters and reviews completed Approval history', async ({ page }) => {
    await separationPage.openAdminTab('Approval');
    await expect(separationPage.statusFilter).toContainText('Pending');
    await separationPage.selectStatus('Approved');
    await expect(separationPage.statusFilter).toContainText('Approved');
    await expect(separationPage.requestIds.first()).toBeVisible();

    await separationPage.openFirstApprovers();
    await expect(separationPage.approversHeading).toBeVisible();
    await captureScreen(page, 'separation', 'admin-approved-history');
  });

  test('reviews approvers for a directly posted resignation', async ({ page }) => {
    await separationPage.openAdminTab('Direct Posting');

    for (const column of [
      'Request ID',
      'Employee Name',
      'Relieving Type',
      'Reason',
      'Resignation Date',
      'Status',
      'Approvers',
    ]) {
      await expect(page.getByText(column, { exact: true }).first()).toBeVisible();
    }

    await separationPage.openFirstApprovers();
    await expect(separationPage.approversHeading).toBeVisible();
    await captureScreen(page, 'separation', 'admin-direct-posting-approvers');
  });

  test('displays approved resignations available for editing', async ({ page }) => {
    await separationPage.openAdminTab('Resignation Editing');

    for (const column of [
      'Request ID',
      'Employee Name',
      'Resignation Date',
      'Relieving Date',
      'Actual Relieving Date',
      'Approval Status',
      'Approvers',
    ]) {
      await expect(page.getByText(column, { exact: true }).first()).toBeVisible();
    }

    await expect(separationPage.requestIds.first()).toBeVisible();
    await separationPage.openFirstApprovers();
    await expect(separationPage.approversHeading).toBeVisible();
    await captureScreen(page, 'separation', 'admin-resignation-editing');
  });

  test('opens and closes an approved resignation editing form without changing data', async ({ page }) => {
    await separationPage.openAdminTab('Resignation Editing');
    await expect(separationPage.requestIds.first()).toBeVisible();
    const requestId = (await separationPage.requestIds.first().textContent())!.trim();

    await page.getByRole('button', { name: requestId, exact: true }).click();
    const editHeading = page.getByRole('heading', {
      name: `Edit Resignation - ${requestId}`,
      exact: true,
    });
    await expect(editHeading).toBeVisible();

    for (const field of [
      'Resignation Submission Date (Editable)',
      'Notice Period',
      'On Notice Start Date',
      'Relieving Date As Per Notice Period',
      'Actual Relieving Date',
      'Relieving Type',
      'Relieving Date (Editable)',
      'Reason (Editable)',
      'Remarks',
    ]) {
      await expect(page.getByText(field, { exact: true }).first()).toBeVisible();
    }

    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(editHeading).toBeHidden();
  });

  test('paginates and sorts direct-posting records', async ({ page }) => {
    await separationPage.openAdminTab('Direct Posting');
    await expect(separationPage.requestIds.first()).toBeVisible();

    await separationPage.sortButton('Request ID').click();
    await expect(separationPage.requestIds.first()).toBeVisible();

    const nextPage = page.getByRole('button', { name: 'Next page', exact: true });
    if (await nextPage.isEnabled()) {
      await nextPage.click();
      await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      );
      await page.getByRole('button', { name: 'Previous page', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Page 1', exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      );
    }
  });

  test('opens but does not submit the admin resignation form', async () => {
    await separationPage.openRequestForm();
    await expect(separationPage.resignationRequestHeading).toBeVisible();
    await expect(separationPage.submitButton).toBeVisible();

    await separationPage.cancelButton.click();
    await expect(separationPage.resignationRequestHeading).toBeHidden();
  });
});
