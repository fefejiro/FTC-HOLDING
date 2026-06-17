import { expect, test } from '@playwright/test';

test.describe('Local demo video classroom', () => {
  test.skip(process.env.ANION_LOCAL_DEMO !== '1', 'Local demo video tests require ANION_LOCAL_DEMO=1.');

  test('tutor can join, leave, and rejoin the local video classroom', async ({ page }) => {
    await page.goto('/api/local-demo/sign-in?role=tutor&next=/lesson/demo-accepted-lesson');

    await expect(page.getByTestId('lesson-call-status')).toContainText('Connected', { timeout: 30_000 });
    await expect(page.getByTestId('daily-custom-call-room')).toBeVisible();
    await expect(page.getByTestId('daily-local-video')).toBeVisible();
    await expect(page.getByTestId('daily-remote-tile')).toBeVisible();

    await page.getByTestId('background-option-soft-blur').click();
    await expect(page.getByTestId('background-status')).toContainText('Soft blur active');
    await expect(page.getByTestId('daily-custom-call-room')).toHaveAttribute('data-background-mode', 'soft-blur');

    await page.getByTestId('background-option-strong-blur').click();
    await expect(page.getByTestId('background-status')).toContainText('Strong blur active');
    await expect(page.getByTestId('daily-custom-call-room')).toHaveAttribute('data-background-mode', 'strong-blur');

    await page.getByTestId('background-option-none').click();
    await expect(page.getByTestId('background-status')).toContainText('Background off');
    await expect(page.getByTestId('daily-custom-call-room')).toHaveAttribute('data-background-mode', 'none');

    await page.getByTestId('leave-lesson-button').click();
    await expect(page.getByTestId('rejoin-lesson-button')).toBeVisible();

    await page.getByTestId('rejoin-lesson-button').click();
    await expect(page.getByTestId('lesson-call-status')).toContainText('Connected', { timeout: 30_000 });
  });

  test('student can join the same accepted local demo lesson', async ({ page }) => {
    await page.goto('/api/local-demo/sign-in?role=student&next=/lesson/demo-accepted-lesson');

    await expect(page.getByTestId('lesson-call-status')).toContainText('Connected', { timeout: 30_000 });
    await expect(page.getByTestId('daily-custom-call-room')).toBeVisible();
    await expect(page.getByTestId('daily-local-video')).toBeVisible();
  });

  test('parent can see dashboard context but cannot join lesson route', async ({ page }) => {
    await page.goto('/api/local-demo/sign-in?role=parent&next=/parent');

    await expect(page.getByText('Parent Dashboard')).toBeVisible();
    await expect(page.getByText('Writing and comprehension coaching')).toBeVisible();

    await page.goto('/lesson/demo-accepted-lesson');
    await expect(page).toHaveURL(/\/dashboard|\/parent/);
  });
});
