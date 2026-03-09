# Learning Module Refactor Note

## Phase 1 PR4 收尾摘要

本次收尾完成以下重構：

- `src/lib/gameConfig.ts` 不再混合管理 learning 與 fun 項目
- learning 內容已完全移至 `src/features/learning/` 模組
- `src/lib/gameConfig.ts` 現在只保留獎勵遊戲（fun games）設定
- 既有 fun games 改由 `FUN_GAMES` 匯出
- 孩子端學習書桌與家長端學習管理皆已改用 learning module 作為單一來源

## 目前責任分工

### Learning Module
- 路徑：`src/features/learning/`
- 負責：
  - 學科
  - 學段
  - 學習單元
  - learning item 顯示排序
  - 舊 `disabled_games` 相容映射

### gameConfig
- 路徑：`src/lib/gameConfig.ts`
- 負責：
  - reward / fun games 註冊
  - fun games 配色設定

## 後續建議

- 若進入 Phase 2，新增數學單元時應直接加到 `src/features/learning/config/`，不要再回填到 `gameConfig.ts`
- 若未來要升級家長控制，建議從 `disabled_games` 漸進遷移到 learning-specific preferences 結構
