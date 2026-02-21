# Mobile Game Window 收尾報告

日期：2026-02-21

## 1) 本次收尾完成項目

- 完成第 3 段第三波頁面改造：
  - `multiplication_test.html`
  - `subtraction_test.html`
- 已完成新視窗/沉浸式流程整合（學習 + 遊戲）：
  - TopHUD（返回 / 暫停 / 停止 / 回首頁）
  - 手機返回鍵（`popstate`）
  - 防呆鎖（重複觸發保護）
  - callback 導航鏈（移除全域事件依賴）
- 已完成回歸驗證：
  - Playwright mobile smoke tests：8/8 通過
  - Vitest（`GameModal` + `useGameWindowController`）：6/6 通過
  - Build：成功

## 2) 手機相容矩陣（public/games）

欄位說明：
- `overflow-y`：body 可垂直捲動
- `no hidden`：body 未使用全域 `overflow: hidden`
- `100dvh`：使用動態視窗高度
- `touch`：使用 `touch-action: manipulation`
- `container cap`：有容器高度上限或 `aspect-square` 限制

| page | overflow-y | no hidden | 100dvh | touch | container cap |
|---|---:|---:|---:|---:|---:|
| 2048_cyber.html | 1 | 1 | 0 | 1 | 1 |
| Tetris.html | 1 | 1 | 1 | 1 | 0 |
| akila_plus_test.html | 1 | 1 | 1 | 0 | 0 |
| bubble_shooter.html | 1 | 1 | 0 | 1 | 1 |
| division_test.html | 1 | 1 | 1 | 0 | 1 |
| idiom_game.html | 1 | 1 | 1 | 0 | 1 |
| memory_matrix.html | 1 | 1 | 1 | 1 | 1 |
| multiplication_test.html | 1 | 1 | 1 | 0 | 1 |
| neon_breaker.html | 1 | 1 | 0 | 1 | 1 |
| neon_slicer.html | 1 | 1 | 1 | 1 | 0 |
| ns_shaft.html | 1 | 1 | 0 | 1 | 1 |
| parkour_game.html | 1 | 1 | 0 | 1 | 0 |
| pronunciation_game.html | 1 | 1 | 1 | 1 | 0 |
| sentence_game.html | 1 | 1 | 1 | 1 | 0 |
| shooting_game.html | 1 | 1 | 1 | 1 | 0 |
| snake_game.html | 1 | 1 | 0 | 1 | 1 |
| spelling_game.html | 1 | 1 | 1 | 1 | 0 |
| subtraction_test.html | 1 | 1 | 1 | 0 | 1 |

## 3) 測試與建置結果

### Playwright
- Command: `npx playwright test tests/mobile-game-layout.spec.ts`
- Result: `8 passed`

### Vitest
- Command: `npx vitest run src/components/GameModal.test.tsx src/hooks/useGameWindowController.test.ts`
- Result: `2 files / 6 tests passed`

### Build
- Command: `npm run build`
- Result: 成功（Vite build 完成）

## 4) 建議（可選，不阻擋上線）

- 針對未使用 `touch-action: manipulation` 的學習頁（如 `akila_plus_test.html`, `division_test.html`, `idiom_game.html`, `multiplication_test.html`, `subtraction_test.html`）可再補齊。
- 針對未出現 `100dvh` 的 fun 類頁面（如 `2048_cyber.html`, `bubble_shooter.html`, `neon_breaker.html`, `ns_shaft.html`, `parkour_game.html`, `snake_game.html`）可逐步加上容器級 `dvh` 上限，以提升極端機型穩定性。

## 5) 結論

- 本次「收尾」已完成且可交付：
  - 核心互動（新視窗 + 返回 + 防呆）穩定
  - 已覆蓋主要手機場景並通過 smoke + unit + build
  - 目前狀態可進入驗收或小規模實機灰度
