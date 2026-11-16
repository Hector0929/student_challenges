import { test, expect } from '@playwright/test';

const VIEWPORTS = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'desktop', width: 1280, height: 800 },
];

test.describe('Memory matrix (怪獸星光圖鑑翻翻樂)', () => {
    for (const vp of VIEWPORTS) {
        test(`clears stage 1, reports stars and fits the ${vp.name} screen`, async ({ page }) => {
            const errors: string[] = [];
            page.on('pageerror', (err) => errors.push(err.message));

            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.goto('/games/memory_matrix.html?userId=test-memory');

            // 不在 iframe 裡時 parent === window，星幣訊息會回到自己身上
            await page.evaluate(() => {
                const w = window as unknown as { __stars: number[] };
                w.__stars = [];
                window.addEventListener('message', (e) => {
                    if (e.data?.type === 'QUESTMON_EARN_STARS') w.__stars.push(e.data.amount);
                });
            });

            await expect(page.locator('#modal-overlay')).toBeVisible();
            await page.click('#modal-primary-btn');
            await expect(page.locator('.card-inner').first()).toBeVisible();

            // 預覽結束後才能翻牌
            await page.waitForFunction('gameState === "playing"', null, { timeout: 15000 });

            const grid = await page.locator('#card-grid').boundingBox();
            expect(grid).not.toBeNull();
            expect(grid!.x + grid!.width).toBeLessThanOrEqual(vp.width + 1);
            expect(grid!.y + grid!.height).toBeLessThanOrEqual(vp.height + 1);

            const pairs = (await page.evaluate(`(() => {
                const byKey = {};
                cards.forEach((c) => (byKey[c.spec.pairKey] ||= []).push(c.index));
                return Object.values(byKey);
            })()`)) as number[][];

            for (const [a, b] of pairs) {
                await page.locator('.card-inner').nth(a).click();
                await page.locator('.card-inner').nth(b).click();
                await page.waitForTimeout(700);
            }

            await page.waitForFunction('stage === 2', null, { timeout: 10000 });
            const stars = await page.evaluate(() => (window as unknown as { __stars: number[] }).__stars);
            expect(stars.reduce((sum, n) => sum + n, 0)).toBeGreaterThan(0);
            expect(errors).toEqual([]);
        });
    }
});
