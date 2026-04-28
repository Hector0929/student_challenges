import { test, expect } from '@playwright/test';

test.describe('Parkour progress isolation', () => {
    test('level unlock progress is isolated by userId', async ({ page }) => {
        await page.goto('/games/parkour_game_v2.html?userId=playwright-user-a');

        await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('parkour_v3_unlock_playwright-user-a', '6');
            localStorage.setItem('parkour_v3_highscores_playwright-user-a', JSON.stringify({ 1: 4200, 6: 9900 }));
        });

        await page.reload();

        await expect(page.locator('#level-cards .level-card.locked')).toHaveCount(0);
        await expect(page.locator('#level-cards .level-card').filter({ hasText: '火山煉獄' })).toContainText('最高 9900');

        await page.goto('/games/parkour_game_v2.html?userId=playwright-user-b');

        await expect(page.locator('#level-cards .level-card.locked')).toHaveCount(5);
        await expect(page.locator('#level-cards .level-card').filter({ hasText: '火山煉獄' })).not.toContainText('最高 9900');
        await expect(page.locator('#level-cards .level-card').filter({ hasText: '霓虹都市' })).not.toContainText('最高 4200');
    });
});