/**
 * 截取每個獎勵遊戲的畫面當遊戲目錄封面。
 * 用法：先開 dev server（npm run dev），再執行
 *   node scripts/capture-game-covers.mjs [baseUrl] [gameId...]
 * 產出：public/games/covers/<id>.jpg（800×500，16:10）
 *
 * 每個遊戲可在 STEPS 裡指定「怎麼進到遊戲畫面」，沒指定就截開始畫面。
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://localhost:5173';
const only = process.argv.slice(2).filter((a) => !a.startsWith('http'));
const OUT = path.resolve('public/games/covers');

const GAMES = {
    parkour: '/games/parkour_game_v3.html',
    shooting: '/games/shooting_game.html',
    tetris: '/games/Tetris.html',
    snake: '/games/snake_game.html',
    ns_shaft: '/games/ns_shaft.html',
    neon_breaker: '/games/neon_breaker.html',
    memory_matrix: '/games/memory_matrix.html',
    neon_slicer: '/games/neon_slicer.html',
    '2048_cyber': '/games/2048_cyber.html',
    bubble_shooter: '/games/bubble_shooter.html',
    monster_bomber: '/games/monster_bomber.html',
    monster_survivor: '/games/monster_survivor.html',
    ember_corridor: '/games/ember_corridor.html',
};

const START_TEXT = /開始|出擊|出發|START|LAUNCH/i;

/** 通用：按下看得到的「開始」按鈕，再隨便操作幾秒，讓畫面有動作 */
async function startAndPlay(page, { selector, keys = ['ArrowLeft', 'ArrowRight', 'Space'], ms = 3000 } = {}) {
    const btn = selector ? page.locator(selector).first() : page.locator('button:visible, .btn:visible').filter({ hasText: START_TEXT }).first();
    if (await btn.count()) await btn.click({ timeout: 3000 }).catch(() => {});
    await page.mouse.move(400, 300);
    const end = Date.now() + ms;
    let i = 0;
    while (Date.now() < end) {
        await page.keyboard.press(keys[i++ % keys.length]).catch(() => {});
        await page.waitForTimeout(250);
    }
}

/** 進到遊戲畫面的步驟：page => Promise<void>；沒列的遊戲用 startAndPlay */
const STEPS = {
    shooting: async () => {}, // 一打開就是遊戲畫面
    '2048_cyber': (p) => startAndPlay(p, { keys: ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'], ms: 2500 }),
    // 左右分散再硬降，疊出幾層方塊
    tetris: (p) =>
        startAndPlay(p, {
            selector: '#main-control-btn-desktop',
            keys: ['ArrowLeft', 'ArrowLeft', 'ArrowLeft', ' ', 'ArrowUp', ' ', 'ArrowRight', 'ArrowRight', ' ', 'ArrowRight', 'ArrowRight', 'ArrowRight', ' ', 'ArrowLeft', ' '],
            ms: 9000,
        }),
    // 一開始會先翻開全部卡片給你記
    memory_matrix: (p) => startAndPlay(p, { keys: ['Shift'], ms: 400 }),
    // 球剛發出去就拍，免得掉球結束
    neon_breaker: (p) => startAndPlay(p, { keys: ['ArrowLeft', 'ArrowRight'], ms: 900 }),
    // 切不到會結束，所以來回揮滑鼠
    neon_slicer: async (p) => {
        await startAndPlay(p, { keys: ['Shift'], ms: 300 });
        const end = Date.now() + 3500;
        let y = 120;
        while (Date.now() < end) {
            await p.mouse.move(60, y);
            await p.mouse.down();
            await p.mouse.move(740, 500 - y, { steps: 12 });
            await p.mouse.up();
            y = y > 380 ? 120 : y + 60;
        }
    },
    parkour: (p) => startAndPlay(p, { selector: '#start-btn', keys: ['Space', 'ArrowRight'], ms: 2500 }),
    ns_shaft: (p) => startAndPlay(p, { selector: '#btn-start', keys: ['ArrowLeft', 'ArrowLeft', 'ArrowRight', 'ArrowRight'], ms: 3000 }),
    monster_bomber: (p) => startAndPlay(p, { selector: '#startBtn', keys: ['ArrowRight', 'ArrowDown'], ms: 1500 }),
    monster_survivor: (p) => startAndPlay(p, { selector: '#goBtn', keys: ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'], ms: 5000 }),
    ember_corridor: (p) => startAndPlay(p, { selector: '#launch', keys: ['ArrowLeft', 'ArrowRight'], ms: 4000 }),
};

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 800, height: 500 }, deviceScaleFactor: 1 });
for (const [id, url] of Object.entries(GAMES)) {
    if (only.length && !only.includes(id)) continue;
    const page = await ctx.newPage();
    try {
        await page.goto(BASE + url, { waitUntil: 'load' });
        await page.waitForTimeout(1500);
        await (STEPS[id] ?? startAndPlay)(page);
        await page.screenshot({ path: path.join(OUT, `${id}.jpg`), type: 'jpeg', quality: 78 });
        console.log('✓', id);
    } catch (e) {
        console.log('✗', id, e.message);
    } finally {
        await page.close();
    }
}
await browser.close();
