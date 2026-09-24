import { expect, test } from '../fixtures/auth.fixture';
import { MyProfilePage } from '../pages/MyProfilePage';
import { monitorApplicationFailures } from '../utils/applicationFailures';
import { expectSuccessfulDownload } from '../utils/downloads';
import { captureScreen } from '../utils/screenshots';

test.describe('My Profile read-only actions dry-run @my-profile @dry-run', () => {
  test('[P1] reads every Surveys and Feedbacks area', async ({ employeeSession }) => {
    const { page } = employeeSession;
    const profile = new MyProfilePage(page);
    const assertNoFailures = monitorApplicationFailures(page, 'Surveys & Feedbacks');
    await profile.open('surveysFeedbacks');

    await expect(page).toHaveURL(/\/my-profile\/surveys-feedbacks\/general(?:\/|$)/);
    for (const area of ['General', 'FS Checklist', 'Exit Feedback']) {
      const areaButton = page.getByRole('button', { name: area, exact: true });
      await expect(areaButton).toBeVisible();
      await areaButton.click();
      await expect(areaButton).toBeVisible();
    }
    await expect(page.getByRole('searchbox', { name: 'Search surveys', exact: true })).toBeVisible();
    await expect(
      page
        .getByRole('button', { name: /^(?:View|Start Survey)$/ })
        .first()
        .or(page.getByText(/No (?:surveys found|Request Available!)/i)),
    ).toBeVisible();
    await captureScreen(page, 'my-profile-dry-run', 'surveys-feedbacks');
    await assertNoFailures();
  });

  test('[P1] opens and cancels a survey without answering or submitting', async ({
    employeeSession,
  }) => {
    const { page } = employeeSession;
    const profile = new MyProfilePage(page);
    const assertNoFailures = monitorApplicationFailures(page, 'Start Survey');
    await profile.open('surveysFeedbacks');

    const startSurvey = page.getByRole('button', { name: 'Start Survey', exact: true }).first();
    await expect(startSurvey).toBeVisible();
    await startSurvey.click();
    const cancel = page.getByRole('button', { name: /Cancel|Close|Back/i }).last();
    await expect(cancel, 'BROKEN FUNCTION: started survey has no non-mutating exit').toBeVisible();
    await captureScreen(page, 'my-profile-dry-run', 'survey-open-before-cancel');
    await cancel.click();
    await expect(page.getByRole('button', { name: /^(?:View|Start Survey)$/ }).first()).toBeVisible();
    await assertNoFailures();
  });

  test('[P1] reads Organisation tabs and cancels Edit without persistence', async ({
    employeeSession,
  }) => {
    const { page } = employeeSession;
    const profile = new MyProfilePage(page);
    const assertNoFailures = monitorApplicationFailures(page, 'Organisation');
    await profile.open('organisation');

    await expect(page).toHaveURL(/\/my-profile\/organisation(?:\/|$)/);
    await expect(page.getByRole('heading', { name: 'Organisation', exact: true })).toBeVisible();
    for (const area of ['Overview', 'Organisation Chart', 'Hierarchy Levels', 'Teams', 'Reports']) {
      await expect(page.getByRole('tab', { name: area, exact: true })).toBeVisible();
    }
    await expect(page.getByText('Total Employees', { exact: true })).toBeVisible();

    const edit = page.getByRole('button', { name: 'Edit entity scope', exact: true });
    await expect(edit, 'BROKEN FUNCTION: Organisation Edit control is unavailable').toBeVisible();
    await edit.click();
    const done = page.getByRole('button', { name: 'Done', exact: true });
    await expect(done, 'BROKEN FUNCTION: Organisation scope editor cannot be closed').toBeVisible();
    await captureScreen(page, 'my-profile-dry-run', 'organisation-editor-open');
    await done.click();
    await expect(done).toBeHidden();

    const exportChart = page.getByRole('button', { name: 'Export Chart', exact: true });
    await expect(exportChart).toBeDisabled();
    await assertNoFailures();
  });

  test('[P1] reads Letter workspaces and safely opens released-letter actions', async ({
    employeeSession,
  }) => {
    const { page } = employeeSession;
    const profile = new MyProfilePage(page);
    const assertNoFailures = monitorApplicationFailures(page, 'Letter');
    await profile.open('letter');

    await expect(page).toHaveURL(/\/my-profile\/request-approvals\/letter(?:\/|$)/);
    await expect(page.getByRole('heading', { name: 'Request & Approvals', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Direct Posting', exact: true })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search letter requests', exact: true })).toBeVisible();

    const firstDataRow = page.getByRole('row').nth(1);
    await expect(firstDataRow).toBeVisible();
    const view = firstDataRow.getByRole('button', { name: /view/i });
    await expect(view, 'BROKEN FUNCTION: released letter has no accessible View action').toBeVisible();
    await view.click();
    const close = page.getByRole('button', { name: /Close|Back|Cancel/i }).last();
    await expect(close, 'BROKEN FUNCTION: released-letter view cannot be closed').toBeVisible();
    await captureScreen(page, 'my-profile-dry-run', 'released-letter-view');
    await close.click();

    const download = firstDataRow.getByRole('button', { name: /download/i });
    await expect(download, 'BROKEN FUNCTION: released letter has no accessible download').toBeVisible();
    await expectSuccessfulDownload(page, download);

    await page.getByRole('button', { name: 'Direct Posting', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Direct Posting', exact: true })).toBeVisible();
    await captureScreen(page, 'my-profile-dry-run', 'letter-direct-posting');
    await assertNoFailures();
  });

  test('[P1] reports Salary Slip loading failures and validates report actions when loaded', async ({
    employeeSession,
  }) => {
    const { page } = employeeSession;
    const profile = new MyProfilePage(page);
    const assertNoFailures = monitorApplicationFailures(page, 'Salary Slip');
    await profile.open('salarySlip');

    await expect(page).toHaveURL(/\/my-profile\/finance\/salary%20slip(?:\/|$)/);
    await expect(page.getByRole('heading', { name: 'Salary Slip', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salary Slip', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Monthly Report', exact: true })).toBeVisible();
    await expect(page.getByRole('combobox')).toContainText(/^20\d{2}$/);
    await captureScreen(page, 'my-profile-dry-run', 'salary-slip-load-state');

    const salarySlipLoadTimeoutMs = 15_000;
    await expect(
      page.getByText('Loading reports...', { exact: true }),
      'BROKEN FUNCTION: Salary Slip remained at Loading reports... during the dry-run observation',
    ).toBeHidden({ timeout: salarySlipLoadTimeoutMs });

    const reportError = page
      .getByText(/failed to load|unable to load|no salary slip|no reports available/i)
      .first();
    if (await reportError.isVisible().catch(() => false)) {
      await expect(reportError).toBeVisible();
      await assertNoFailures();
      return;
    }

    const download = page.getByRole('button', { name: /^Download / }).first();
    await expect(
      download,
      'Salary Slip loaded without a report action or an explicit empty/error state',
    ).toBeVisible();
    await expectSuccessfulDownload(page, download);
    await page.getByRole('button', { name: 'Monthly Report', exact: true }).click();
    await captureScreen(page, 'my-profile-dry-run', 'salary-slip-monthly-report');
    await assertNoFailures();
  });
});
