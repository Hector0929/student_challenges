# Game Design Upgrade Report

日期：2026-02-22

## 版本目標
採用兒童友善節奏循環：

**開始 10 秒驚喜 → 30 秒任務暖身 → 120 秒精彩時刻 → 結束獎勵**

---

## Phase A（收尾補完）

### A-1 touch 操作一致化
已補齊 `touch-action: manipulation`：
- [public/games/akila_plus_test.html](public/games/akila_plus_test.html)
- [public/games/division_test.html](public/games/division_test.html)
- [public/games/idiom_game.html](public/games/idiom_game.html)
- [public/games/multiplication_test.html](public/games/multiplication_test.html)
- [public/games/subtraction_test.html](public/games/subtraction_test.html)

### A-2 `100dvh` 與容器上限補齊
已補齊 `min-height: 100dvh` 或等價容器限制：
- [public/games/2048_cyber.html](public/games/2048_cyber.html)
- [public/games/bubble_shooter.html](public/games/bubble_shooter.html)
- [public/games/neon_breaker.html](public/games/neon_breaker.html)
- [public/games/ns_shaft.html](public/games/ns_shaft.html)
- [public/games/parkour_game.html](public/games/parkour_game.html)
- [public/games/snake_game.html](public/games/snake_game.html)

---

## Phase B（遊戲設計強化）

### B-1 shooting（節奏與任務強化）
檔案： [public/games/shooting_game.html](public/games/shooting_game.html)

已新增：
- `連擊` HUD（`streakDisplay`）
- `本局任務` HUD（`missionDisplay`）
- 節奏階段提示（`phaseDisplay`）
- 結算摘要：最高連擊 / 任務結果 / 鼓勵語
- 任務系統（答對題數 / 連續答對 / 擊退敵人）
- 正確答案連擊加分、超時重置連擊
- 文案改為兒童友善鼓勵語

### B-2 snake（風險回報 + 任務）
檔案： [public/games/snake_game.html](public/games/snake_game.html)

已新增：
- `COMBO` HUD（吃果實連續加成）
- `MISSION` HUD（本局任務）
- 節奏階段提示（`phase`）
- 邊緣吃果實額外加分（風險回報）
- 任務完成加分（吃果實數 / 邊緣吃果實）
- 結算文案加入最高連擊與任務完成狀態

### B-3 idiom（學習回饋強化）
檔案： [public/games/idiom_game.html](public/games/idiom_game.html)

已新增：
- 遊戲階段提示（`phase-text`）
- 本局任務（`mission-text`）
- 快速回答獎勵（限時加分）
- 任務完成加分（答對數 / 連擊任務）
- 結算鼓勵語附任務完成狀態

---

## Phase C（驗證與交付）

### 測試結果
- Playwright 手機 smoke：`8 passed`
  - 測試檔案： [tests/mobile-game-layout.spec.ts](tests/mobile-game-layout.spec.ts)
- Vitest（新視窗控制）：`6 passed`
  - [src/components/GameModal.test.tsx](src/components/GameModal.test.tsx)
  - [src/hooks/useGameWindowController.test.ts](src/hooks/useGameWindowController.test.ts)
- Build：成功

---

## Phase B 第二波（擴展到更多遊戲）

### B2-1 2048（策略節奏 + 任務）
檔案： [public/games/2048_cyber.html](public/games/2048_cyber.html)

已新增：
- `COMBO` HUD（連續回合合成）
- `MISSION` HUD（合成目標 / 合成次數）
- 節奏階段提示（`phase`）
- 結算摘要（最高連擊 / 任務狀態 / 鼓勵語）
- 任務完成即時獎勵分數

### B2-2 neon_breaker（打擊節奏 + 任務）
檔案： [public/games/neon_breaker.html](public/games/neon_breaker.html)

已新增：
- `COMBO` HUD（連續打磚）
- `MISSION` HUD（擊碎數量 / 連擊挑戰）
- 節奏階段提示（`phase`）
- 掉球重置連擊（維持操作張力）
- 結算摘要（最高連擊 / 任務狀態）

### B2-3 parkour（FLOW 節奏 + 任務）
檔案： [public/games/parkour_game.html](public/games/parkour_game.html)

已新增：
- `FLOW` HUD（連續收星節奏）
- `MISSION` HUD（距離 / 收星 / 連續收星）
- 節奏階段提示（`phase`）
- 受傷重置 FLOW（風險與穩定操作回饋）
- 結算摘要（最高 FLOW / 任務狀態）

### 第二波驗證
- Playwright 手機 smoke：`8 passed`
  - 測試檔案： [tests/mobile-game-layout.spec.ts](tests/mobile-game-layout.spec.ts)
- Build：成功

---

## Phase B 第三波（再擴展三款遊戲）

### B3-1 bubble_shooter（消除節奏 + 任務）
檔案： [public/games/bubble_shooter.html](public/games/bubble_shooter.html)

已新增：
- `MISSION` HUD（消除數 / 連擊 / 分數目標）
- 節奏階段提示（`phase-display`）
- 任務完成即時獎勵分數
- 結算摘要（最高連擊 / 任務狀態）

### B3-2 ns_shaft（生存 FLOW + 任務）
檔案： [public/games/ns_shaft.html](public/games/ns_shaft.html)

已新增：
- `FLOW` HUD（穩定落台連續節奏）
- `MISSION` HUD（深度 / 落台次數 / FLOW）
- 節奏階段提示（`phase-display`）
- 受傷歸零 FLOW（讓操作風險更有回饋）
- 結算摘要（最高 FLOW / 任務狀態）

### B3-3 neon_slicer（連斬節奏 + 任務）
檔案： [public/games/neon_slicer.html](public/games/neon_slicer.html)

已新增：
- `COMBO` HUD（連續切中圖形）
- `MISSION` HUD（切中數 / 連斬 / 分數）
- 節奏階段提示（`phase-display`）
- 連斬加分（越連續分數越高）
- 結算摘要（最高連斬 / 任務狀態）

### 第三波驗證
- Playwright 手機 smoke：`8 passed`
  - 測試檔案： [tests/mobile-game-layout.spec.ts](tests/mobile-game-layout.spec.ts)
- Build：成功

### 交付結論
- 手機可操作性（A）已補完。
- Phase B 已完成三波擴展（共 9 款遊戲）。
- 驗證與報告（C）已完成，可進入你下一輪驗收與微調。

---

## 下一步建議（可直接進行）
1. 擴充任務池（每款由 2~3 個任務擴到 6~8 個）。
2. 增加 `每日小目標` 與 `本週徽章`，提升回流。
3. 在 [src/components/GameModal.tsx](src/components/GameModal.tsx) 增加「本局亮點卡片」統一模板，讓所有遊戲結束後都有同樣的獎勵體驗。
