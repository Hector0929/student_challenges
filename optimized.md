# 遊戲優化紀錄與交接手冊（optimized.md）

> 給接手優化其他遊戲的 Claude Code 讀。
> 內容：2026-10-30 ～ 2026-10-31 這兩天做了什麼、為什麼這樣做、兩個已完成的遊戲改版（方塊衝刺、銀河守衛）是怎麼設計與驗證的，以及優化下一個遊戲時要照著走的流程與檢查清單。
> 使用者偏好：**回覆與遊戲內文字一律用繁體中文**；介面給國小孩童使用，以平板、手機觸控為主。

---

## 0. 先讀這段（TL;DR）

1. **先提計畫和畫面示意，問完問題再動手。** 使用者每次都要求「先給我看計畫」，兩個遊戲都是先做 mockup 截圖給他看、他回答問題後才實作。
2. **遊戲是 `public/games/*.html` 的單一 HTML 檔**，在 `GameModal` 的 iframe 裡跑。改版時通常是**整檔重寫並取代原檔**，`src/lib/gameConfig.ts` 的 `FUN_GAMES` 只需改 `url` / `description`。
3. **必須保留**：舊的進度（localStorage，換 key 時要做遷移）、星星結算方式（`QUESTMON_EARN_STARS` postMessage）、使用者說要保留的難度模式。
4. **風格**：參考「怪獸塔 V4」——明亮、圓潤、可愛的怪獸（有眼睛、表情），2D canvas 自己畫，不要用外部圖片網址；魔王可以用 `public/images/monsters/cutout/boss_*.png`。
5. **觸控優先**：單指就能玩，按鈕至少 42px，手指不能擋住主角。
6. **一定要驗證**：Playwright 截圖 + 自動遊玩機器人（測試掛勾 `window.__xxx` + `?ts=` 加速）跑完所有關卡，確認無 JS 錯誤、結算訊息正確、進度存檔正確。
7. **不要自己 push**。使用者說「push」才 commit + push 到 `main`。

---

## 1. 遊戲在這個 App 裡是怎麼運作的

### 1.1 載入與付費

| 項目 | 位置 / 值 |
|---|---|
| 遊戲清單 | `src/lib/gameConfig.ts` → `FUN_GAMES`（`id`、`name`、`icon`、`description`、`url`、`color`），顏色在同檔 `FUN_COLORS` |
| 開啟遊戲 | `src/components/GameModal.tsx`，用 iframe 載入 `url`，並自動加上 `?userId=<小孩 id>` |
| 每次遊玩費用 | `GAME_COST = 5` 星幣（`src/lib/constants.ts`） |
| 每次遊玩時間 | `GAME_DURATION_SECONDS = 180`（3 分鐘），時間到 GameModal 進入 `timeup`，iframe 變成不能點（`pointerEvents: none`） |
| 遊戲島開放條件 | 學習挑戰群島上要完成 4 項每日任務（`DAILY_QUEST_TARGET = 4`）遊戲島才開放 |

> ⚠️ **3 分鐘限制很重要**：遊戲裡的星星結算若只在「遊戲結束」才送，玩到時間到還沒結束就拿不到星星。設計結算時機時要考慮這點（見 §6 已知問題）。

### 1.2 遊戲內賺星星（結算協定）

遊戲用 `postMessage` 通知父頁面，`GameModal` 收到後入帳：

```js
window.parent.postMessage({
  type: 'QUESTMON_EARN_STARS',
  txId: `<gameId>-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, // 必須唯一；同 txId 只入帳一次
  amount: stars,                // 正整數
  gameId: '<FUN_GAMES 的 id>',
  description: '給家長看的說明，例如：方塊衝刺 1-2「小溪」過關（★★☆）',
}, window.location.origin);
```

`GameModal` 的檢查（`GameModal.tsx` 約 386–420 行）：
- `event.source` 必須是該 iframe、`event.origin` 必須同源。
- `type === 'QUESTMON_EARN_STARS'`、`amount > 0`、`txId` 去重。
- 入帳後交易會寫進 `star_transactions`（帶 `game_id`），學習挑戰群島的「群島日誌」會顯示真實紀錄。

遊戲端自己也要防重複送（例如 `settlementReported` / `S.settled` 旗標）。

### 1.3 每位小孩分開存進度

- 從網址讀 `userId`：`const USER_ID = new URLSearchParams(location.search).get('userId') || '';`
- localStorage key 加上 userId：`const userKey = (base) => (USER_ID ? \`${base}_${USER_ID}\` : base);`
- **換 key 或換存檔格式時，第一次載入要讀舊 key 做遷移**，不能讓小孩掉關卡。
- 所有 `localStorage` 存取都包 `try/catch`（無痕模式會丟例外）。

---

## 2. 這兩天做了什麼（總覽）

| 主題 | 狀態 | 主要檔案 |
|---|---|---|
| 學習挑戰群島（3D 群島，取代個人頁面） | 已推 `0079a36` | `src/features/challengeIsland/`（`ChallengeIslandFullScreen.tsx`、`model.ts`、`useChallengeIsland.ts`、`engine/`） |
| 每日任務島、遊戲島需完成 4 項任務才開放 | 已推 | `model.ts`（`gameUnlockState`、`QUEST_ISLAND_ID`、`GAME_ISLAND_ID`） |
| 首頁使用者清單：點頭像進原本 dashboard、點「進入我的群島」直接進群島 | 已推 | `src/pages/RoleSelection.tsx`、`src/App.tsx`（`ChildView`） |
| 怪獸塔 V4（螺旋塔、蛇梯棋式前進，保留所有怪獸與進度）放在「怪獸島」 | 已推 | `src/components/MonsterTowerV4.tsx`、`src/components/tower/`、`src/lib/towerSpiralLayout.ts` |
| 群島日誌改成真實紀錄、名牌開關真的有作用 | 已推 | `ChallengeIslandFullScreen.tsx` |
| **方塊衝刺改版**（怪獸塔風格 2D、15 關） | 已推 `a103dee` | `public/games/parkour_game_v3.html`、`tests/parkour-user-progress.spec.ts` |
| **銀河守衛改版**（傳統直向射擊、三機編隊） | 已推 `7ba2856` | `public/games/ember_corridor.html`、`tests/ember-corridor-progress.spec.ts` |
| 群島清單每座島可收合／展開（記住狀態） | 尚未 commit | `ChallengeIslandFullScreen.tsx`、`challengeIsland.css` |

---

## 3. 範例一：方塊衝刺（`parkour_game_v3.html`）

### 3.1 使用者需求與流程
1. 「畫面風格類似怪獸塔，但還是 2D，運作上更豐富，先給我看計畫」→ 提出計畫。
2. 「我想看一下草原關卡的畫面」→ 做 canvas mockup 並截圖。
3. 「來試作第一版」→ 先做草原 3 關。
4. 「考量平板跟手機：單點跳、雙點跳更高、往下滑躺下」→ 加手勢。
5. 「一次完成剩下的關卡」→ 五大區域 15 關。
6. 「可以替代本來的方塊衝刺了」→ 改 `gameConfig.ts` 的 `url` 指向新檔。

### 3.2 設計重點
- **五大區域 × 3 關**：晨霧草原、冰晶斷崖、熔岩工坊、機械雲城、星穹神殿。每區有自己的調色盤、敵人、追逐魔王（`ZONES`）。
- **關卡用文字地圖拼接**（`CHUNKS`，每個字元一格，10 列，第 8–9 列是地面），`STAGES` 用片段名稱組合關卡 → 之後增修關卡很容易。
- **夥伴**（`PALS`：slime / drop / bird / cloud）、怪獸蛋收集、每關 1–3 顆星。
- **教學告示牌**依片段顯示，觸控裝置顯示觸控版說明（`IS_TOUCH = matchMedia('(pointer: coarse)')`）。

### 3.3 觸控手勢（重要經驗）
- 單點 = 跳（約 1.4 格）、雙點 = 跳更高（約 2.5 格）、往下滑 = 滑行／空中快速落地。
- 用 **90 ms 判斷視窗** 區分單點、雙點、滑動，避免誤判。
- 驗證數據：單點約 1.41 格、雙點約 2.48 格、下滑可穿過木頭橫桿且不會跳起來、空中下滑約 0.28 秒落地。

### 3.4 存檔與結算
- 存檔 key：`parkour_v4_save_{userId}`，第一次載入會把舊的 `parkour_v3_unlock_{userId}`（舊 6 主題）換算成新解鎖數。
- **每過一關就結算一次**（`reportStars(stars, stage)`，amount = 該關星數 1–3）→ 不怕 3 分鐘時間到拿不到星星。

### 3.5 測試掛勾
- `window.__parkour`：`state`、`start`、`finish`、`teleport`、`level`、`STAGES`、`CHUNKS`。
- `?ts=2`：時間加速（1–4 倍）；`?debug`：除錯顯示。
- 自動遊玩機器人跑完 15 關全部過關。

### 3.6 實作中踩到的坑
- 追逐魔王跑出畫面外 → 限制在玩家後方固定距離（`p.x - 6.2`）。
- emoji 金幣在某些裝置是灰色 → 改成 canvas 畫的金幣。
- 手機選單溢出 → CSS 修正。
- 會碎的冰塊放在頭的高度，2-2、2-3 卡關 → 改用彈跳蘑菇設計。
- 過關面板延遲出現蓋到下一關 → 顯示前先檢查目前模式。
- 全解鎖時選單會停在最後一區，測試要先點回草原分頁。

---

## 4. 範例二：銀河守衛（`ember_corridor.html`）

### 4.1 使用者需求與決策
需求：「想要有三台戰機，玩法像傳統的戰機遊戲（附直向射擊遊戲截圖），先設計看看，有問題可以問我」。

先做 mockup（戰鬥畫面 + 選機畫面）並問 4 個問題，使用者回答：
1. 選一台主機，撿到「僚」道具後變成截圖那樣的三機編隊。
2. 保留原本難度設計（標準／輔助模式）。
3. 先做 6 關。
4. 維持原本星星算法。

### 4.2 原本的遊戲（改版前）
暗色線條風、核心是「按住鎖定、放開發射雷射」、5 種武器、6 關、魔王用怪獸圖。結算在整場結束時送一次（新版已改成每關發放）。

### 4.3 新設計
- **操作**：自動射擊；手指在畫面任何地方拖曳 = **相對移動**（手指不會擋住戰機，移動量 ×1.25）；鍵盤方向鍵/WASD、空白鍵炸彈、P/Esc 暫停。
- **判定點**只有戰機中央一小圈（半徑 4，畫成粉紅白點），子彈看起來多但躲得掉。
- **三台主機**（`SHIPS`）：
  - 赤焰號（均衡）散射砲：3→9 道扇形子彈。
  - 疾風號（速度）雷射光束：穿透同一直線所有敵機，Lv.3 起加側邊針彈。
  - 鐵甲號（火力）重砲 + Lv.2 起追蹤飛彈。
- **道具**：P 火力（最多 Lv.5，被擊落掉一級並吐成道具）、僚 僚機（最多 2 架、無敵、會射針彈與追蹤飛彈）、B 炸彈、金幣。保底空投每 20–26 秒一次。
- **敵機**：可愛圓滾的怪獸戰機（drone / diver / fighter / turret / carrier），預先畫進離屏 canvas 快取。編隊路線：橫掃、V 字、繞圈、俯衝、定點停留、補給艦橫越。整隊全滅給獎勵。
- **魔王**：戰艦外殼 + 騎在上面的怪獸塔魔王圖（`/images/monsters/cutout/boss_slime|storm|flame|ufo|water|dragon.png`，384×384 去背 voxel 圖）。血量 66% / 33% 換階段（取消子彈、短暫無敵、提示「魔王發怒了」）。招式表 `BOSS_ATK`（aim3/aim5/aim3fast/ring10/12/18/spiral4/6/rain/wall/petal/cross）。
- **六個主題**（`THEMES`）：星港、雷雲、熔岩、冰晶、深海、龍王；背景漸層 + 星雲先畫到離屏 canvas，星星與裝飾（太空站、雲、隕石、冰晶、泡泡、彩虹光點）往下捲動。
- **畫面尺寸**：邏輯寬固定 480，高度依螢幕比例 640–1040（手機直式填滿），平板橫式左右留邊。

### 4.4 保留的部分
- 星星算法（總數）完全不變：
  `max(1, min(60, floor(score/1600) + cleared*4 + (win?12:0) + floor(kills/12)))`
- **發放時機改成每過一關一次**（`payStars(cleared, win, description)`）：過關時用當下的分數算出總數，只發「總數 − 這場已發」的差額；被擊落或全破時再補最後差額。每次都是新的 txId。結算畫面顯示整場合計 `starsPaid`。這樣 3 分鐘時間到也不會白打。
- 模式：標準（殘機 3、炸彈 3）、輔助（殘機 5、炸彈 5、子彈 0.78 倍速、射擊頻率 0.72 倍）。
- 過關補 1 顆炸彈（上限為模式初始數）、從中段關卡出擊給補償火力。
- 進度改成每位小孩分開：`ember_corridor_progress_{userId}`，沒有時讀舊的共用 key `ember_corridor_progress`。

### 4.5 平衡調整過程（可參考的方法）
- **分數膨脹**：新版敵機與金幣多，星星直接頂到 60 上限 → 降低敵機分數（drone 80、fighter 220…）、金幣 10、編隊獎勵 500，讓得分接近舊版規模。
- **赤焰號打魔王太久**（終極魔王 65 秒）→ 提高散射傷害、降低第 5、6 關魔王血量。
- **小孩程度機器人**都死在魔王 → 第 1 關魔王改成較少子彈的招式、血量 750。
- **顏色衝突**：敵彈不能和玩家子彈同色（第 1、6 關原本都是粉紅）→ 每關敵彈改成和玩家子彈對比的顏色。
- **金幣和敵彈太像**（橘黃敵彈 vs 金色金幣）→ 敵彈全部改成紅 / 紫色系（避開金色、玩家的粉/橘/青/薄荷綠），並加深色外框、白色核心，一眼看得出是危險物。
- **矮螢幕**（平板橫式）魔王被 HUD 擋住 → 魔王位置與尺寸依高度調整。

### 4.6 測試掛勾與驗證
- `window.__stg`：`state`、`game`、`player`、`enemies`、`ebullets`、`wingmen`、`start(stage, ship, mode)`、`skipWaves()`、`god(on)`、`STAGES`、`SHIPS`。
- `?ts=3`：時間加速（內部以 1/60 秒分段模擬，避免子彈穿透）。
- 驗證結果：三台主機皆可全破、結算訊息正確、進度存檔正確、無 JS 錯誤；`tests/ember-corridor-progress.spec.ts` 3 項通過。

---

## 5. 優化下一個遊戲的流程（照這個走）

### 5.1 步驟
1. **研究現況**：讀遊戲 HTML，找出核心玩法、存檔 key、結算方式（多數舊遊戲沒有結算，見 §7）、操作方式。用 Playwright 截圖現況。
2. **提出計畫（文字）**：新玩法、操作、關卡/內容、道具、風格、保留項目、驗證方式。
3. **做 mockup**：在 scratchpad 寫一個獨立 HTML 用 canvas 畫出關鍵畫面（例如戰鬥畫面 + 選單），Playwright 截圖給使用者看。
4. **問問題**：把需要使用者決定的事列出來並給建議選項（例如模式要不要保留、關卡數、星星算法）。等回答再實作。
5. **實作**：整檔重寫，維持單一 HTML、無建置步驟、無外部 CDN（只用 `/images/...` 站內資源）。
6. **驗證**（§5.4）。
7. **回報**：繁體中文說明做了什麼、怎麼驗證、哪裡跟以前不一樣、還沒驗證的部分，並問是否要 commit / push。

### 5.2 設計規則（孩童、觸控）
- 單手、單指能玩；不需要同時按兩個按鈕。
- 按鈕最小 42px，重要按鈕（炸彈、跳躍）約 70px，放在拇指好按的位置（右下）。
- 觸控移動用**相對拖曳**，不要讓主角跳到手指底下。
- 開場顯示幾秒操作提示（例如「👆 手指拖曳移動・自動射擊」）。
- 失敗要溫和：被打中掉一級並把道具吐出來讓小孩撿回；結算文案鼓勵為主。
- 提供較簡單的模式（輔助模式）或保底機制（保底空投、檢查點）。
- `body { touch-action: none; user-select: none; }`、可捲動的選單區域用 `touch-action: pan-y`。
- 視窗切走（`visibilitychange`）自動暫停。

### 5.3 視覺風格（怪獸塔 V4）
- 明亮飽和的配色、圓潤造型、怪獸都有大眼睛和表情（白眼球 + 黑瞳孔 + 高光，生氣時加眉毛）。
- 方塊衝刺草原區調色盤可參考：天空 `#9fd8f0 → #e6f6fb`、草地 `#a6d96a / #7cbf4a`、金幣 `#f4c542 / #c98a00`、屋頂紅 `#b4483a`。
- 選單 UI：深藍紫漸層或柔和米色卡片、金黃色主按鈕 `linear-gradient(#ffe08a, #ffb347)` 加下方陰影、選中狀態用金色邊框 `#ffd166`。
- emoji 在部分裝置顯示不一致（例如金幣變灰），**重要圖示用 canvas 自己畫**。
- 效能：光暈、敵機、子彈先畫到離屏 canvas 再 `drawImage`；不要每幀用 `shadowBlur`；粒子設上限（約 500）。`devicePixelRatio` 上限 2。

### 5.4 驗證清單
- [ ] Playwright 截圖：選單、遊戲中、魔王/高潮畫面、結算畫面；手機直式（390×844）與平板橫式（1024×768）。
- [ ] 監聽 `pageerror` 與 4xx 回應，必須為 0。
- [ ] 加測試掛勾 `window.__<game>` 與 `?ts=` 加速，寫自動遊玩機器人跑完所有關卡。
- [ ] 再做一個「小孩程度」機器人（移動較慢、只看 0.3 秒內、忽略 30% 子彈），觀察死在哪裡、拿到多少星星，用來調難度。
- [ ] 確認 `QUESTMON_EARN_STARS` 內容（在頁面 `addEventListener('message')` 收集）與星數合理（拿 5 星幣的入場費比較）。
- [ ] 進度：不同 `userId` 互不影響、舊進度會遷移。寫成 `tests/<game>-progress.spec.ts`（參考 `tests/parkour-user-progress.spec.ts`、`tests/ember-corridor-progress.spec.ts`）。
- [ ] `npx tsc -b --noEmit`、`npx eslint <改過的 ts/tsx>`。

---

## 6. 已知問題與注意事項

1. ~~銀河守衛只在整場結束時結算~~ → 已改成每過一關發一次（見 §4.4）。其他遊戲新增結算時也請照這個模式，別只在整場結束才發。
2. 銀河守衛的 `postMessage` 目標是 `'*'`（沿用舊版），方塊衝刺用 `window.location.origin`。新遊戲請用 `window.location.origin`。
3. GameModal 不會傳訊息給 iframe（沒有暫停/時間到通知），遊戲無法得知 3 分鐘到了。
4. Vitest 有 6 個在這次修改前就失敗的測試（useWorldState、ChildWorldBankPanel、ChildWorldShopStreet、learningFilters ×2、LearningHub），不是遊戲改版造成的。跑 vitest 時排除 `.claude/**` 與 `tests/**`，並把輸出寫到檔案（用 pipe 容易卡住）。
5. 本機 Playwright 用系統 Chrome：`executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`；臨時腳本放在專案根目錄才找得到 `playwright` 套件（跑完刪掉）。`playwright.config.ts` 的 baseURL 是 `http://localhost:5173`，會自動 `npm run dev`。
6. Vite dev 下 `/challenge-island/` 這種資料夾路徑會被 SPA 吃掉，要寫完整的 `.../index.html`。
7. `public/challenge-island/` 是舊的獨立版群島，未追蹤、未使用，等使用者決定是否刪除，**不要 commit 它**。

---

## 7. 其他遊戲現況（待優化）

| id | 名稱 | 檔案 | 行數 | 遊戲內結算 | 分人存檔 |
|---|---|---|---|---|---|
| shooting | 射擊遊戲 | `shooting_game.html` | 983 | 無 | 無 |
| tetris | 俄羅斯方塊 | `Tetris.html` | 531 | 無 | 無 |
| snake | 貪食蛇 | `snake_game.html` | 464 | 無 | 無 |
| ns_shaft | 小朋友下樓梯 | `ns_shaft.html` | 598 | 無 | 無 |
| neon_breaker | 霓虹打磚塊 | `neon_breaker.html` | 459 | 無 | 無 |
| memory_matrix | 記憶矩陣 | `memory_matrix.html` | 401 | 無 | 無 |
| neon_slicer | 光劍切切樂 | `neon_slicer.html` | 459 | 無 | 無 |
| 2048_cyber | 2048 Cyber | `2048_cyber.html` | 527 | 無 | 無 |
| bubble_shooter | 霓虹泡泡龍 | `bubble_shooter.html` | 1057 | 無 | 無 |
| monster_bomber | 怪獸塔爆爆冒險 | `monster_bomber.html` | 1118 | 無 | 無 |
| monster_survivor | 怪獸生存戰 | `monster_survivor.html` | 1370 | 有 | 無 |
| parkour | 方塊衝刺 | `parkour_game_v3.html` | — | ✅ 每關 | ✅ |
| ember_corridor | 銀河守衛 | `ember_corridor.html` | — | ✅ 整場結束 | ✅ |

（「遊戲內結算」= 檔案內有 `QUESTMON_EARN_STARS`；「分人存檔」= 有讀 `userId`。）

注意：`tests/mobile-game-layout.spec.ts` 會開啟 `2048_cyber.html`、`snake_game.html`、`bubble_shooter.html` 等檔案檢查手機版面，改版這些遊戲時要一起確認這個測試。

新增結算前要先和使用者確認「是否要讓這個遊戲能賺星星、算法為何」，不要自行決定。

---

## 8. 常用指令

```bash
npm run dev                                   # 開發伺服器（預設 5173）
npx vite --port 5189 --strictPort             # 另開一個埠做截圖/機器人測試
npx playwright test tests/<spec>.ts --reporter=line
npx tsc -b --noEmit
npx eslint src/lib/gameConfig.ts
```

Commit 訊息格式（使用者要求時才 commit / push 到 `main`）：
```
feat(<game-id>): <英文摘要>

- 條列重點

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```
