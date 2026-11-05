import { test, expect, type Page } from '@playwright/test';

type MsHook = {
    S: { mode: string; userPaused: boolean; hostPaused: boolean; run: { t: number; starsPaid: number } | null; payLog: Array<{ amount: number; description: string }> };
    P: { hp: number };
    start: (map?: number, pal?: string, mode?: string) => void;
    skipTo: (t: number) => void;
    god: (on?: boolean) => void;
    choose: (i?: number) => void;
};
// 升級選單會讓遊戲停住，測試時直接選第一張
const skipLevelUp = (page: Page) => page.evaluate(() => {
    const M = (window as unknown as { __ms: MsHook }).__ms;
    if (M.S.mode === 'levelup') M.choose(0);
});
const ms = (page: Page) => page.evaluate(() => {
    const M = (window as unknown as { __ms: MsHook }).__ms;
    return { mode: M.S.mode, t: M.S.run?.t ?? 0, stars: M.S.run?.starsPaid ?? 0, pays: M.S.payLog.map((p) => p.amount) };
});

// 怪獸生存戰：每位小孩的地圖進度分開存；GameModal 暫停／時間到時遊戲要完全停住
test.describe('Monster survivor', () => {
    test('map unlock progress is isolated by userId', async ({ page }) => {
        await page.goto('/games/monster_survivor.html?userId=pw-ms-a');
        await page.evaluate(() => {
            localStorage.clear();
            localStorage.setItem('monster_survivor_v2_pw-ms-a', JSON.stringify({ unlocked: 4, best: { 0: 3, 1: 2, 2: 1 } }));
        });
        await page.reload();
        await expect(page.locator('.map.lock')).toHaveCount(2);

        await page.goto('/games/monster_survivor.html?userId=pw-ms-b');
        await expect(page.locator('.map.lock')).toHaveCount(5);
    });

    test('picking mode, partner and starting a run', async ({ page }) => {
        await page.goto('/games/monster_survivor.html?userId=pw-ms-c');
        await page.click('[data-mode=endless]');
        await page.click('[data-pal=cloud]');
        await page.click('[data-testid=go]');
        await expect.poll(async () => (await ms(page)).mode).toBe('play');
        const pal = await page.evaluate(() => (window as unknown as { __ms: { P: { pal: string; weapons: Record<string, number> } } }).__ms.P);
        expect(pal.pal).toBe('cloud');
        expect(pal.weapons.thunder).toBe(1);
    });

    test('host pause freezes the game and resume continues', async ({ page }) => {
        await page.goto('/games/monster_survivor.html?userId=pw-ms-d&ts=4');
        await page.evaluate(() => {
            const M = (window as unknown as { __ms: MsHook }).__ms;
            M.start(0, 'slime', 'endless');
            M.god(true);
        });
        await page.waitForTimeout(500);
        await skipLevelUp(page);
        // 模擬 GameModal 時間到（iframe 外層送的訊息，這裡從自己這一層送，同源即可）
        await page.evaluate(() => window.dispatchEvent(new MessageEvent('message', { data: { type: 'QUESTMON_PAUSE', reason: 'timeup' }, origin: location.origin, source: window.parent })));
        const frozen = (await ms(page)).t;
        await page.waitForTimeout(800);
        expect((await ms(page)).t).toBe(frozen);

        await page.evaluate(() => window.dispatchEvent(new MessageEvent('message', { data: { type: 'QUESTMON_RESUME', reason: 'playing' }, origin: location.origin, source: window.parent })));
        await expect.poll(async () => { await skipLevelUp(page); return (await ms(page)).t; }).toBeGreaterThan(frozen);
    });

    test('a star is paid for every surviving minute', async ({ page }) => {
        await page.goto('/games/monster_survivor.html?userId=pw-ms-e&ts=4');
        await page.evaluate(() => {
            const M = (window as unknown as { __ms: MsHook }).__ms;
            M.start(0, 'slime', 'endless');
            M.god(true);
            M.skipTo(59.5);
        });
        await expect.poll(async () => { await skipLevelUp(page); return (await ms(page)).stars; }).toBe(1);
        expect((await ms(page)).pays).toEqual([1]);
    });
});
