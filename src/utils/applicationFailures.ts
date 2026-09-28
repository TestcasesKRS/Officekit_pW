import { expect, Page } from '@playwright/test';

export function monitorApplicationFailures(page: Page, area: string): () => Promise<void> {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(`page error: ${error.message}`));
  page.context().on('page', (openedPage) => {
    openedPage.on('pageerror', (error) => failures.push(`page error: ${error.message}`));
  });
  page.context().on('response', (response) => {
    if (response.url().includes('/api/') && response.status() >= 400) {
      failures.push(`HTTP ${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  return async () => {
    expect(failures, `BROKEN FUNCTION in ${area}: unexpected application failures`).toEqual([]);
  };
}
