import { expect, Locator, Page } from '@playwright/test';

export async function expectSuccessfulDownload(page: Page, button: Locator): Promise<void> {
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15_000 }).catch((error: Error) => {
      throw new Error(`BROKEN FUNCTION: download action did not start. ${error.message}`);
    }),
    button.click(),
  ]);

  expect(download.suggestedFilename(), 'BROKEN FUNCTION: download has no filename').not.toBe('');
  expect(await download.failure(), 'BROKEN FUNCTION: download did not complete').toBeNull();
}
