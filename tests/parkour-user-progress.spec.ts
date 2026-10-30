import { test, expect } from '@playwright/test';

// 方塊衝刺（怪獸塔大冒險）：每位小孩的進度分開存，舊版進度會換算過來
test.describe('Parkour progress isolation', () => {
    test('stage unlock progress is isolated by userId', async ({ page }) => {
        await page.goto('/games/parkour_game_v3.html?userId=playwright-user-a');

        await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('parkour_v4_save_playwright-user-a', JSON.stringify({
                unlocked: 15,
                best: { '1-1': { stars: 3, coins: 40, egg: true, time: 44 } },
                companion: 'slime',
            }));
        });

        await page.reload();
        // 全部解鎖時選關畫面會停在最新的區域，先切回草原
        await page.click('[data-zone="grass"]');

        // 草原三關都解鎖，其他區域也能點
        await expect(page.locator('#stages .stage[disabled]')).toHaveCount(0);
        await expect(page.locator('#stages .stage').filter({ hasText: '第一步' })).toContainText('★★★');
        await expect(page.locator('#zones .zone[disabled]')).toHaveCount(0);

        await page.goto('/games/parkour_game_v3.html?userId=playwright-user-b');

        // 另一位小孩只開第一關，其他區域鎖住
        await expect(page.locator('#stages .stage[disabled]')).toHaveCount(2);
        await expect(page.locator('#stages .stage').filter({ hasText: '第一步' })).not.toContainText('★★★');
        await expect(page.locator('#zones .zone[disabled]')).toHaveCount(4);
    });

    test('old six-theme progress is converted on first load', async ({ page }) => {
        await page.goto('/games/parkour_game_v3.html?userId=playwright-user-c');

        await page.evaluate(() => {
            localStorage.clear();
            // 舊版解鎖到第 3 關 → 新版解鎖 round(2 × 2.5) + 1 = 6 關（草原全開、冰晶全開）
            localStorage.setItem('parkour_v3_unlock_playwright-user-c', '3');
        });

        await page.reload();

        await expect(page.locator('#stages .stage[disabled]')).toHaveCount(0);
        await expect(page.locator('#zones .zone[disabled]')).toHaveCount(3);
    });
});
