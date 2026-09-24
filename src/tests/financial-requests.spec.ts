import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Browser, expect, test } from '@playwright/test';
import {
  FinancialModule,
  FinancialRequestsPage,
} from '../pages/FinancialRequestsPage';
import { LoginCredentials, LoginPage } from '../pages/LoginPage';
import { requiredEnvironmentVariable } from '../utils/environment';
import { captureScreen } from '../utils/screenshots';

const sleepTime = Number(process.env.SLEEP_TIME ?? 0);
const modules: FinancialModule[] = ['Loans', 'Advance', 'Claims'];
const approvalModules: FinancialModule[] = ['Loans', 'Advance', 'Claims'];
const lifecycleModules: FinancialModule[] = ['Loans', 'Advance'];
const lifecycleRunId =
  process.env.FINANCIAL_LIFECYCLE_RUN_ID ??
  new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

type LifecycleJournal = Record<
  string,
  {
    submissionStarted: true;
    requestId?: string;
  }
>;

async function readLifecycleJournal(filePath: string): Promise<LifecycleJournal> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as LifecycleJournal;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function writeLifecycleJournal(
  filePath: string,
  journal: LifecycleJournal,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(journal, null, 2));
  await rename(temporaryPath, filePath);
}

async function withFinancialSession<T>(
  browser: Browser,
  baseURL: string | undefined,
  credentials: LoginCredentials,
  action: (financialRequests: FinancialRequestsPage) => Promise<T>,
): Promise<T> {
  const context = await browser.newContext({ baseURL });
  try {
    const page = await context.newPage();
    const financialRequests = new FinancialRequestsPage(page, sleepTime);
    await new LoginPage(page, sleepTime).login(credentials);
    await financialRequests.openFromProfile();
    return await action(financialRequests);
  } finally {
    await context.close();
  }
}
const employee: LoginCredentials = {
  companyCode: requiredEnvironmentVariable('COMPANY_CODE'),
  username: requiredEnvironmentVariable('EMPLOYEE_USERNAME'),
  password: requiredEnvironmentVariable('EMPLOYEE_PASSWORD'),
};
const approver: LoginCredentials = {
  companyCode: requiredEnvironmentVariable('COMPANY_CODE'),
  username: requiredEnvironmentVariable('ADMIN_USERNAME'),
  password: requiredEnvironmentVariable('ADMIN_PASSWORD'),
};

test.describe.configure({ mode: 'serial' });

test.describe('Employee financial requests @financial-requests @financial-requests-user', () => {
  let financialRequests: FinancialRequestsPage;

  test.beforeEach(async ({ page }) => {
    financialRequests = new FinancialRequestsPage(page, sleepTime);
    await new LoginPage(page, sleepTime).login(employee);
    await financialRequests.openFromProfile();
  });

  for (const module of modules) {
    test(`${module} displays its request workspace and explicit list state`, async ({ page }) => {
      await financialRequests.openWorkspace(module, 'Request');

      await expect(page).toHaveURL(financialRequests.routeFor(module, 'Request'));
      await expect(financialRequests.moduleButton(module)).toBeVisible();
      if (module !== 'Claims') {
        await expect(financialRequests.workspaceTab('Request')).toBeVisible();
      }
      await expect(financialRequests.addRequestButton).toBeVisible();
      await expect(financialRequests.searchInput).toBeVisible();
      await expect(financialRequests.statusFilter).toBeVisible();
      await expect(financialRequests.exportButton).toBeVisible();
      await expect(
        financialRequests.requestRows.first().or(financialRequests.noRequestsMessage).first(),
      ).toBeVisible();

      if (module === 'Claims') {
        for (const column of [
          'Request ID',
          'Category',
          'Sub Category',
          'Description',
          'Requested date',
          'Approve Status',
          'Approvers',
          'Actions',
        ]) {
          await expect(page.getByText(column, { exact: true }).first()).toBeVisible();
        }
      }

      await captureScreen(
        page,
        'financial-requests',
        `employee-${module.toLowerCase()}-workspace`,
      );
    });

    test(`${module} exposes statuses and filters without requiring seeded rows`, async () => {
      await financialRequests.openWorkspace(module, 'Request');

      const statuses = module === 'Claims' ? ['All', 'Approved', 'Pending', 'Rejected'] : ['Pending'];
      for (const status of statuses) {
        await financialRequests.selectStatus(status);
        await expect(financialRequests.statusFilter).toContainText(status);
      }
      await expect(
        financialRequests.requestRows.first().or(financialRequests.noRequestsMessage).first(),
      ).toBeVisible();
    });

    test(`${module} checks its non-mutating request form behavior`, async ({ page }) => {
      await financialRequests.openWorkspace(module, 'Request');

      if (module === 'Claims') {
        const categoryResponsePromise = page.waitForResponse(
          (response) =>
            response.url().includes('/api/Claims/LoadCategory') &&
            response.request().method() === 'GET',
        );
        await financialRequests.addRequestButton.click();
        const categoryResponse = await categoryResponsePromise;

        expect(categoryResponse.status()).toBe(500);
        await expect(page).toHaveURL(financialRequests.routeFor(module, 'Request'));
        await captureScreen(page, 'financial-requests', 'employee-claims-category-error');
        return;
      }

      await financialRequests.openRequestForm();

      await expect(financialRequests.requestFormHeading(module)).toBeVisible();
      await expect(financialRequests.cancelButton).toBeVisible();
      await expect(financialRequests.submitButton).toBeVisible();
      await expect(financialRequests.requestFormPanel.getByText('Select Scheme*')).toBeVisible();
      await expect(financialRequests.requestFormPanel.getByText('Expected Sanction Date*')).toBeVisible();
      await expect(financialRequests.requestFormPanel.getByText('Loan Amount', { exact: true })).toBeVisible();
      await expect(financialRequests.requestFormPanel.getByText('Total Month', { exact: true })).toBeVisible();
      await expect(financialRequests.requestFormPanel.getByText('Reason', { exact: true })).toBeVisible();
      await expect(financialRequests.approvalWorkflowHeading).toBeVisible();
      await expect(financialRequests.requestFormPanel.getByText('No approvers found')).toBeVisible();
      await expect(financialRequests.submitButton).toBeDisabled();

      await captureScreen(
        page,
        'financial-requests',
        `employee-${module.toLowerCase()}-request-form`,
      );
      await financialRequests.closeRequestForm();
    });

    test(`${module} exports Excel and PDF downloads`, async ({ page }) => {
      await financialRequests.openWorkspace(module, 'Request');

      const moduleEmptyState =
        module === 'Claims'
          ? page.getByText('No claim requests found.', { exact: true })
          : page.getByText('No Request Available!', { exact: true });
      if (module === 'Claims') {
        await expect(page.getByText('Requested date', { exact: true }).first()).toBeVisible();
      }
      await expect(
        moduleEmptyState.or(financialRequests.requestRows.getByRole('button').first()),
      ).toBeVisible();
      const hasOnlyEmptyState = (await financialRequests.requestRows.allInnerTexts()).every((text) =>
        /^No (?:Request|claim|approval)/.test(text.trim()),
      );
      if (
        hasOnlyEmptyState ||
        !(await financialRequests.exportButton.isEnabled())
      ) {
        await expect(financialRequests.exportButton).toBeDisabled();
        return;
      }

      for (const exportOption of [
        { name: 'Export as Excel', extension: '.xlsx' },
        { name: 'Export as PDF', extension: '.pdf' },
      ]) {
        await financialRequests.openExportMenu();
        const downloadPromise = page.waitForEvent('download');
        await financialRequests.exportOption(exportOption.name).click();
        const download = await downloadPromise;

        expect(download.suggestedFilename().toLowerCase()).toMatch(
          new RegExp(`\\${exportOption.extension}$`),
        );
        expect(await download.failure()).toBeNull();
      }
    });
  }
});

test.describe('Approver financial approvals @financial-requests @financial-requests-approver', () => {
  let financialRequests: FinancialRequestsPage;

  test.beforeEach(async ({ page }) => {
    financialRequests = new FinancialRequestsPage(page, sleepTime);
    await new LoginPage(page, sleepTime).login(approver);
    await financialRequests.openFromProfile();
  });

  for (const module of approvalModules) {
    test(`${module} checks every approval workspace exposed to the approver`, async ({ page }) => {
      await financialRequests.openModule(module);
      const approvalTab = financialRequests.workspaceTab('Approval');

      await expect(approvalTab).toBeVisible();
      await financialRequests.openWorkspace(module, 'Approval');
      await expect(page).toHaveURL(financialRequests.routeFor(module, 'Approval'));
      await expect(financialRequests.searchInput).toBeVisible();
      await expect(financialRequests.statusFilter).toContainText(/Pending|All/);
      await expect(financialRequests.exportButton).toBeVisible();
      await expect(
        financialRequests.requestRows.first().or(financialRequests.noRequestsMessage).first(),
      ).toBeVisible();
      await captureScreen(
        page,
        'financial-requests',
        `approver-${module.toLowerCase()}-pending`,
      );

      await financialRequests.selectStatus('Approved');
      await expect(financialRequests.statusFilter).toContainText('Approved');
      await expect(
        financialRequests.requestRows.first().or(financialRequests.noRequestsMessage).first(),
      ).toBeVisible();

      if (await financialRequests.viewButtons.first().isVisible()) {
        await financialRequests.openFirstApprovers();
        await expect(financialRequests.approversHeading).toBeVisible();
      }
    });
  }

});

test.describe('Financial approval lifecycles @mutating @financial-lifecycle', () => {
  for (const module of lifecycleModules) {
    test(`${module} completes the two-level approval and rejection matrix`, async ({ browser }) => {
      test.setTimeout(600_000);
      const companyCode = requiredEnvironmentVariable('COMPANY_CODE');
      const lifecycleEmployee: LoginCredentials = {
        companyCode,
        username: requiredEnvironmentVariable('EMPLOYEE_USERNAME'),
        password: requiredEnvironmentVariable('EMPLOYEE_PASSWORD'),
      };
      const approverOne: LoginCredentials = {
        companyCode,
        username: requiredEnvironmentVariable('FINANCIAL_APPROVER_1_USERNAME'),
        password: requiredEnvironmentVariable('FINANCIAL_APPROVER_1_PASSWORD'),
      };
      const approverTwo: LoginCredentials = {
        companyCode,
        username: requiredEnvironmentVariable('FINANCIAL_APPROVER_2_USERNAME'),
        password: requiredEnvironmentVariable('FINANCIAL_APPROVER_2_PASSWORD'),
      };
      const moduleMarker = module.toLowerCase();
      const markers = {
        approved: `financial-lifecycle-${lifecycleRunId}-${moduleMarker}-approved`,
        rejectedAtOne: `financial-lifecycle-${lifecycleRunId}-${moduleMarker}-rejected-l1`,
        rejectedAtTwo: `financial-lifecycle-${lifecycleRunId}-${moduleMarker}-rejected-l2`,
      };
      const baseURL = test.info().project.use.baseURL;
      const journalPath = path.join(
        '.playwright',
        'financial-lifecycle',
        `${encodeURIComponent(lifecycleRunId)}.json`,
      );
      const journal = await readLifecycleJournal(journalPath);
      const createTrackedRequest = async (marker: string): Promise<string> => {
        const entry = journal[marker];
        if (entry?.submissionStarted && !entry.requestId) {
          throw new Error(
            `Financial lifecycle cannot safely retry ${marker}: submission started but no request ID was captured.`,
          );
        }
        return withFinancialSession(
          browser,
          baseURL,
          lifecycleEmployee,
          (financialRequests) => financialRequests.createRequest(module, marker, {
            requestId: entry?.requestId,
            onBeforeSubmit: async () => {
              journal[marker] = { submissionStarted: true };
              await writeLifecycleJournal(journalPath, journal);
            },
            onRequestCaptured: async (requestId) => {
              journal[marker] = { submissionStarted: true, requestId };
              await writeLifecycleJournal(journalPath, journal);
            },
            onSubmitRejected: async () => {
              delete journal[marker];
              await writeLifecycleJournal(journalPath, journal);
            },
          }),
        );
      };

      const rejectedAtOneRequestId = await createTrackedRequest(markers.rejectedAtOne);
      await withFinancialSession(browser, baseURL, approverOne, async (financialRequests) => {
        await financialRequests.decideRequest(
          module,
          rejectedAtOneRequestId,
          'Reject',
          markers.rejectedAtOne,
        );
      });

      const rejectedAtTwoRequestId = await createTrackedRequest(markers.rejectedAtTwo);
      await withFinancialSession(browser, baseURL, approverOne, async (financialRequests) => {
        await financialRequests.decideRequest(
          module,
          rejectedAtTwoRequestId,
          'Approve',
          markers.rejectedAtTwo,
        );
      });
      await withFinancialSession(browser, baseURL, approverTwo, async (financialRequests) => {
        await financialRequests.decideRequest(
          module,
          rejectedAtTwoRequestId,
          'Reject',
          markers.rejectedAtTwo,
        );
      });

      const approvedRequestId = await createTrackedRequest(markers.approved);
      await withFinancialSession(browser, baseURL, approverOne, async (financialRequests) => {
        await financialRequests.decideRequest(module, approvedRequestId, 'Approve', markers.approved);
      });
      await withFinancialSession(browser, baseURL, approverTwo, async (financialRequests) => {
        await financialRequests.decideRequest(module, approvedRequestId, 'Approve', markers.approved);
        await financialRequests.expectRequestStatus(approvedRequestId, 'Approved');
      });
      await withFinancialSession(browser, baseURL, approverOne, async (financialRequests) => {
        await financialRequests.openWorkspace(module, 'Approval');
        await financialRequests.expectRequestStatus(approvedRequestId, 'Approved');
      });

      await withFinancialSession(browser, baseURL, lifecycleEmployee, async (financialRequests) => {
        await financialRequests.openWorkspace(module, 'Request');
        await financialRequests.expectRequestStatus(approvedRequestId, 'Approved');
        await financialRequests.expectRequestStatus(rejectedAtOneRequestId, 'Rejected');
        await financialRequests.expectRequestStatus(rejectedAtTwoRequestId, 'Rejected');
      });
    });
  }
});
