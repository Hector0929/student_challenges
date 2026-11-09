// 把英文書港字庫（src/features/englishHarbour/data/words.ts）轉成怪獸單字闖關用的 JSON。
// 字庫有更新時執行：node scripts/build-word-quest-data.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(resolve(root, 'src/features/englishHarbour/data/words.ts'), 'utf8');
const out = resolve(root, 'public/games/word_quest/words.json');

const topicsBlock = src.match(/export const TOPICS[^=]*=\s*\[([\s\S]*?)\];/)?.[1];
if (!topicsBlock) throw new Error('找不到 TOPICS');
const topics = [...topicsBlock.matchAll(/\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*icon:\s*'([^']+)'\s*\}/g)].map(([, id, name, icon]) => ({ id, name, icon }));

const seen = new Set();
const result = topics.map((t) => {
  const block = src.match(new RegExp(`\\n\\s*${t.id}:\\s*\`([\\s\\S]*?)\``))?.[1] ?? '';
  const words = [];
  for (const line of block.split('\n')) {
    const [word, , zh, emoji = ''] = line.split('|').map((s) => s.trim());
    if (!word || !zh || seen.has(word)) continue;
    seen.add(word);
    // 只收純英文字母、2～12 個字母的字，片語和縮寫不考拼字
    if (!/^[A-Za-z]{2,12}$/.test(word)) continue;
    words.push(emoji ? [word, zh, emoji] : [word, zh]);
  }
  return { ...t, words };
});

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ source: 'src/features/englishHarbour/data/words.ts', topics: result }) + '\n');
console.log(`寫入 ${out}`);
for (const t of result) console.log(`  ${t.id.padEnd(9)} ${String(t.words.length).padStart(4)} 字  ${t.name}`);
