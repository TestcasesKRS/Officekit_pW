import { expect, test } from '../fixtures/auth.fixture';
import { MyProfilePage } from '../pages/MyProfilePage';
import { monitorApplicationFailures } from '../utils/applicationFailures';
import { expectSuccessfulDownload } from '../utils/downloads';
import { captureScreen } from '../utils/screenshots';

test.describe('My Profile content libraries dry-run @my-profile @dry-run', () => {
  test('[P1] reads Forms and Policies and downloads an available document', async ({
    employeeSession,
  }) => {
    const { page } = employeeSession;
    const profile = new MyProfilePage(page);
    const assertNoFailures = monitorApplicationFailures(page, 'Forms and Policies');
    await profile.open('formsPolicies');

    await expect(page).toHaveURL(/\/my-profile\/forms-policy(?:\/|$)/);
    await expect(page.getByRole('heading', { name: 'Forms and Policies', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'forms', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'policies', exact: true })).toBeVisible();
    await expect(page.getByText('Form Title', { exact: true })).toBeVisible();
    await expect(page.getByText('Description', { exact: true }).first()).toBeVisible();

    const firstDataRow = page
      .getByRole('row')
      .filter({ has: page.getByRole('button', { name: /download/i }) })
      .first();
    await expect(firstDataRow).toBeVisible();
    await captureScreen(page, 'my-profile-dry-run', 'forms-and-policies');
    const download = firstDataRow.getByRole('button', { name: /download/i });
    await expect(
      download,
      'BROKEN FUNCTION: listed Forms and Policies document has no accessible download action',
    ).toBeVisible();
    await expect(download).toBeEnabled();
    await expectSuccessfulDownload(page, download);

    await page.getByRole('button', { name: 'policies', exact: true }).click();
    await expect(page.getByRole('button', { name: 'policies', exact: true })).toBeVisible();
    await assertNoFailures();
  });

  test('[P1] opens Forms and Policies from the dashboard alternate entry', async ({
    employeeSession,
  }) => {
    const { page } = employeeSession;
    const assertNoFailures = monitorApplicationFailures(page, 'HR Forms & Policies alternate entry');
    await page.goto('/');

    const alternateEntry = page.getByRole('heading', { name: 'Forms & Policies', exact: true });
    await expect(alternateEntry).toBeAttached();
    const carousel = alternateEntry.locator('xpath=ancestor::div[contains(@class,"relative")][1]');
    const nextCard = carousel.locator('..').locator(':scope > button').last();
    for (const cardName of ['Attendance', 'Payroll', 'Forms & Policies']) {
      const card = page
        .getByRole('heading', { name: cardName, exact: true })
        .locator('xpath=ancestor::div[contains(@class,"carousel-item")][1]');
      const transitionFinished = card.evaluate(
        (element) => new Promise<void>((resolve) => {
          element.addEventListener('transitionend', () => resolve(), { once: true });
        }),
      );
      await nextCard.click();
      await transitionFinished;
      await expect(card).toHaveAttribute('style', /translate3d\(0px/);
    }
    await alternateEntry
      .locator('xpath=ancestor::div[contains(@class,"carousel-item")][1]')
      .click();
    await expect(page).toHaveURL(/\/my-profile\/forms-(?:policy|policiesHR)(?:\/|$)/);
    await expect(page.getByRole('heading', { name: 'Forms and Policies', exact: true })).toBeVisible();
    await captureScreen(page, 'my-profile-dry-run', 'hr-forms-policies-alternate-entry');
    await assertNoFailures();
  });

  test('[P2] paginates Forms and Policies without changing records', async ({ employeeSession }) => {
    const { page } = employeeSession;
    const profile = new MyProfilePage(page);
    const assertNoFailures = monitorApplicationFailures(page, 'Forms and Policies pagination');
    await profile.open('formsPolicies');

    const next = page.getByRole('button', { name: 'Next page', exact: true });
    await expect(next).toBeEnabled();
    await next.click();
    await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await page.getByRole('button', { name: 'Previous page', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Page 1', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await assertNoFailures();
  });

  test('[P1] reads the holiday year and list state', async ({ employeeSession }) => {
    const { page } = employeeSession;
    const profile = new MyProfilePage(page);
    const assertNoFailures = monitorApplicationFailures(page, 'My Holidays');
    await profile.open('holidays');

    await expect(page).toHaveURL(/\/my-profile\/my-holidays(?:\/|$)/);
    await expect(page.getByRole('heading', { name: 'My Holidays', exact: true })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: /Search by holiday/i })).toBeVisible();
    await expect(page.getByRole('combobox')).toContainText(/^20\d{2}$/);
    for (const column of ['Holidays', 'From Date', 'To Date', 'No of Days']) {
      await expect(page.getByText(column, { exact: true }).first()).toBeVisible();
    }
    await expect(
      page.getByRole('row').nth(1).or(page.getByText(/No holidays found/i)).first(),
    ).toBeVisible();
    await captureScreen(page, 'my-profile-dry-run', 'my-holidays');
    await assertNoFailures();
  });

  test('[P2] paginates holiday records and returns to the first page', async ({ employeeSession }) => {
    const { page } = employeeSession;
    const profile = new MyProfilePage(page);
    const assertNoFailures = monitorApplicationFailures(page, 'My Holidays pagination');
    await profile.open('holidays');

    const next = page.getByRole('button', { name: 'Next page', exact: true });
    await expect(next).toBeEnabled();
    await next.click();
    await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await page.getByRole('button', { name: 'Previous page', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Page 1', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await assertNoFailures();
  });

  test('[P1] reads Released News and its explicit list state', async ({ employeeSession }) => {
    const { page } = employeeSession;
    const profile = new MyProfilePage(page);
    const assertNoFailures = monitorApplicationFailures(page, 'News Feeds');
    await profile.open('newsFeeds');

    await expect(page).toHaveURL(/\/my-profile\/news-feed\/released(?:\/|$)/);
    await expect(page.getByRole('heading', { name: 'News Feeds', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Released News', exact: true })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search news feeds', exact: true })).toBeVisible();
    for (const column of ['Event Type', 'News Titles', 'News Feeds', 'Posted By', 'End Date']) {
      await expect(page.getByText(column, { exact: true }).first()).toBeVisible();
    }
    await expect(
      page.getByRole('row').nth(1).or(page.getByText(/No news (?:feeds )?found/i)).first(),
    ).toBeVisible();
    await captureScreen(page, 'my-profile-dry-run', 'news-feeds');
    await assertNoFailures();
  });
});
