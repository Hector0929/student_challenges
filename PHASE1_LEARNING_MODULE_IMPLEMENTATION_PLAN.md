# Phase 1 技術實作計畫：Learning Module 骨架與資訊架構重構

## 0. 進度回填（更新日：2026-03-09）

### 0.1 Phase 1 執行狀態

- ✅ Step 1 完成：`types` / `config` 已落地到 `src/features/learning/`
- ✅ Step 2 完成：`learningFilters` / `learningAdapters` 已落地並有測試
- ✅ Step 3 完成：`LearningHub`、`SubjectSection`、`StageSection` 已上線
- ✅ Step 4 完成：`LearningArea` 已改由 learning module 驅動
- ✅ Step 5 完成：`ParentSettings` 已改由 learning module 管理 learning items
- ✅ Step 6 完成：learning flow 已不再依賴 `GAMES.filter(...learning...)`

### 0.2 Phase 2（數學單元）目前進度

- ✅ 已上線：分數、因數與倍數、面積
- ✅ 本次新增上線：周長、體積（React 題型 + generator + registry）
- ✅ 本次新增上線：國中代數（`linear_equation`、`polynomials`）

### 0.3 下一步（Phase 2 剩餘）

1. 補齊更多國中題型變體（文字題、分數係數）
2. 強化錯題回顧與解題步驟提示
3. 增加 E2E 驗收（孩子端切換學段、家長端停用代數單元）

## 1. 文件目的

本文件是 [MATH_LEARNING_MODE_SPEC.md](MATH_LEARNING_MODE_SPEC.md) 的第一階段實作計畫，目標是將目前分散在 `gameConfig.ts` 與 `LearningArea.tsx` 中的學習內容，重構為獨立的 learning module。

Phase 1 **不直接開發完整數學題庫**，而是先建立：
- 新的 learning module 架構
- 學習內容設定來源
- 國小 / 國中的資訊架構
- 學習入口 UI 骨架
- 與現有家長設定 / GameModal / 練習頁面的相容橋接

---

## 2. Phase 1 目標

### 2.1 主要目標

1. 將學習內容自 [src/lib/gameConfig.ts](src/lib/gameConfig.ts) 拆出
2. 建立 `src/features/learning/` 模組骨架
3. 讓 [src/components/LearningArea.tsx](src/components/LearningArea.tsx) 改由 learning module 驅動
4. 建立「學科 → 學段 → 單元」的資料模型
5. 讓數學可分為「國小」與「國中」顯示
6. 保持現有練習頁與 `GameModal` 可繼續使用
7. 保持家長的 `disabled_games` 設定在過渡期內仍可生效

### 2.2 非目標

以下內容**不屬於 Phase 1**：
- 新數學題目引擎
- 新的 React 題目作答頁
- 錯題統計資料庫
- 學習報表
- 家長分學段精細權限設定
- 舊四則運算 HTML 頁面的搬遷重寫

---

## 3. 為什麼 Phase 1 要先做骨架

目前學習書桌有兩個核心問題：

1. **內容來源錯位**
   - 學習內容和娛樂遊戲共存在 [src/lib/gameConfig.ts](src/lib/gameConfig.ts)
   - 導致學習內容只能被當作普通 game card 處理

2. **資料結構不足**
   - 現有 `Game` 型別無法表達：
     - 學科
     - 學段
     - 單元領域
     - 題型
     - 顯示群組

如果不先建立骨架，後續分數、面積、周長、一元一次方程式等單元只會繼續堆在舊結構上，未來維護成本會更高。

---

## 4. Phase 1 成功定義

當 Phase 1 完成時，應達成以下結果：

- 學習內容不再依賴 `GAMES.filter(g => g.category === 'learning')`
- `LearningArea` 改由 learning module 配置驅動
- 數學內容可顯示為：
  - 國小數學
  - 國中數學
- 語文內容也能被納入 learning module，而不是留在 `gameConfig.ts`
- 既有 HTML 練習頁仍可從新結構啟動
- `gameConfig.ts` 後續可逐步回歸只管理 fun games

---

## 5. 實作策略

### 5.1 採用漸進式重構

不直接大改所有邏輯，而採以下策略：

#### Step A：新增 learning module
- 新增型別、設定檔、資料轉換 helper

#### Step B：讓 `LearningArea` 改讀新模組
- UI 仍沿用現有風格
- 啟動方式仍透過 `GameModal`

#### Step C：保留相容層
- 家長設定頁仍可暫時沿用 `disabled_games`
- learning module 中每個 item 需提供穩定 id，與既有 disabled id 對應

#### Step D：將 `gameConfig.ts` 逐步縮小責任
- Phase 1 完成時，程式邏輯上學習區不再依賴 `GAMES`
- 是否立即移除 learning 類項目，可留到 Phase 1 收尾或 Phase 2 再做

---

## 6. 新模組目錄規劃

## 6.1 目標目錄

```text
src/features/learning/
├── config/
│   ├── learningStages.ts
│   ├── learningSubjects.ts
│   ├── learningItems.ts
│   ├── mathUnits.ts
│   └── learningDisplay.ts
├── types/
│   ├── learning.ts
│   └── math.ts
├── utils/
│   ├── learningFilters.ts
│   └── learningAdapters.ts
└── components/
    ├── LearningHub.tsx
    ├── SubjectSection.tsx
    ├── StageSection.tsx
    ├── LearningItemCard.tsx
    └── EmptyLearningState.tsx
```

## 6.2 角色說明

### `types/learning.ts`
定義共用學習型別：
- subject
- stage
- learning item
- launcher
- 顯示分組

### `types/math.ts`
定義數學專用欄位：
- domain
- grades
- practice modes
- supportsVisualAid

### `config/learningSubjects.ts`
定義學科：
- math
- english
- chinese

### `config/learningStages.ts`
定義學段：
- elementary
- junior_high
- general

### `config/learningItems.ts`
定義所有學習卡片的單一來源：
- 語文既有項目
- 數學既有項目
- 新數學單元預留項目

### `config/mathUnits.ts`
定義數學單元專屬 metadata

### `config/learningDisplay.ts`
定義首頁排序、分區顯示規則

### `utils/learningFilters.ts`
處理：
- disabled item 過濾
- subject/stage/group 排序
- UI 顯示邏輯

### `utils/learningAdapters.ts`
處理與舊結構相容：
- 將 learning item 轉成 `GameModal` 可啟動的 launcher
- 將既有 `disabled_games` 套用到新 learning item

---

## 7. 資料模型設計

## 7.1 共用型別

```ts
export type LearningSubjectId = 'math' | 'english' | 'chinese';
export type LearningStageId = 'general' | 'elementary' | 'junior_high';
export type LearningLauncherType = 'html' | 'react';
```

```ts
export interface LearningSubject {
  id: LearningSubjectId;
  name: string;
  icon: string;
  description: string;
  order: number;
}
```

```ts
export interface LearningStage {
  id: LearningStageId;
  name: string;
  description: string;
  order: number;
}
```

```ts
export interface LearningLauncher {
  type: LearningLauncherType;
  target: string;
}
```

```ts
export interface LearningItem {
  id: string;
  name: string;
  shortName?: string;
  icon: string;
  description: string;
  subjectId: LearningSubjectId;
  stageId: LearningStageId;
  order: number;
  enabledByDefault: boolean;
  launcher: LearningLauncher;
  legacyDisabledKey?: string;
  accentColorToken?: string;
}
```

## 7.2 數學擴充型別

```ts
export type MathDomain =
  | 'number_operations'
  | 'fractions'
  | 'factors_multiples'
  | 'measurement'
  | 'geometry'
  | 'algebra';
```

```ts
export interface MathLearningItem extends LearningItem {
  subjectId: 'math';
  stageId: 'elementary' | 'junior_high';
  domain: MathDomain;
  grades: string[];
  supportsVisualAid: boolean;
  isPlanned?: boolean;
}
```

### 7.3 設計理由

- `legacyDisabledKey` 用於 Phase 1 過渡，讓現有 `disabled_games` 不必立刻改資料庫
- `launcher` 抽象化後，未來同一單元可啟動 HTML 頁或 React 頁
- `isPlanned` 可讓尚未開發完的單元先存在於規格層，但不一定出現在 UI

---

## 8. Learning Items 規劃

## 8.1 語文項目（Phase 1 必須納入）

雖然本次主題是數學重構，但 `LearningArea` 不是只有數學，所以 Phase 1 必須一併將現有語文內容納入新 learning module：

- spelling
- pronunciation
- sentence
- idiom

### 建議配置
- `spelling` → `english` / `general`
- `pronunciation` → `english` / `general`
- `sentence` → `english` / `general`
- `idiom` → `chinese` / `general`

## 8.2 數學既有項目（Phase 1 必須納入）

- akila
- subtraction
- multiplication
- division

### 建議配置
- `akila` → `math` / `elementary`
- `subtraction` → `math` / `elementary`
- `multiplication` → `math` / `elementary`
- `division` → `math` / `elementary`

## 8.3 數學新單元（Phase 1 可先註冊、先不顯示）

- fractions
- factors_multiples
- perimeter
- area
- volume
- linear_equation
- polynomials

### 建議 Phase 1 做法
- 先把這些單元定義在 config 中
- 以 `isPlanned: true` 標註
- 預設不顯示在正式 UI，或顯示為「即將推出」取決於產品決策

**建議 Phase 1 預設先不顯示未開發單元**，避免孩子點進去沒有內容。

---

## 9. UI 資訊架構設計

## 9.1 Phase 1 目標 UI

目前 `LearningArea` 是一個平鋪 grid。

Phase 1 建議調整為以下結構：

```text
學習書桌
├── 英文學習
│   ├── 單字召喚術
│   ├── 發音選單字
│   └── 句子重組
│
├── 國語學習
│   └── 成語大挑戰
│
└── 數學學習
    ├── 國小數學
    │   ├── 加法
    │   ├── 減法
    │   ├── 乘法
    │   └── 除法
    │
    └── 國中數學
        └── （先保留空容器或不顯示）
```

## 9.2 Phase 1 UI 決策

### 決策 A：保留單一頁面，不新增多層路由
- 仍在 `ChildDashboard` 中顯示 `LearningArea`
- 不做新 route
- 減少改動風險

### 決策 B：新增 section 化顯示
- `LearningArea` 改為渲染多個 section
- 由新模組提供資料分組

### 決策 C：國中區塊顯示策略

建議 Phase 1 採：
- 若沒有可顯示的國中單元，則不顯示「國中數學」區塊
- 不強制顯示空卡片

理由：
- 避免孩子看到不能點的內容
- Phase 2 / 3 再自然開啟即可

---

## 10. 舊系統相容策略

## 10.1 與 `GameModal` 相容

Phase 1 不重寫 `GameModal`，只建立新的 launcher adapter。

### 實作方式
每個 learning item 提供：
- name
- id
- launcher.type
- launcher.target

由 `LearningArea` 仍然將選取 item 餵給 `GameModal`：

```ts
{
  gameName: item.name,
  gameId: item.id,
  gameUrl: item.launcher.target
}
```

### 好處
- 練習獎勵機制不必改
- 既有 HTML 題目頁不必改
- 新資料層先落地即可

## 10.2 與 `disabled_games` 相容

目前家長設定使用 `disabled_games: string[]` 管理項目停用。

Phase 1 建議：
- **資料庫不變更**
- learning item 的 id 儘量沿用既有 id
- 新增 `legacyDisabledKey` 作為兼容欄位

### 規則
- 舊項目：`id === legacyDisabledKey`
- 新項目：若未上線，先不加入家長控制清單
- 未來真正要支援學段/主題控制時，再另外設計 `learning_preferences`

## 10.3 與 `ParentSettings` 相容

Phase 1 不建議立刻重做家長設定結構，只做最小改動：

### Phase 1 方案
- `ParentSettings` 的學習區塊改讀 learning module，而非 `GAMES.filter(...learning...)`
- UI 還是使用既有 `GameToggleRow`
- 先以 flatten 方式顯示所有已上線 learning items

### 不在 Phase 1 處理
- 按學科分區控制
- 按學段控制
- 批次開關國小 / 國中

---

## 11. 具體檔案變更清單

## 11.1 新增檔案

### A. 型別
- `src/features/learning/types/learning.ts`
- `src/features/learning/types/math.ts`

### B. 設定
- `src/features/learning/config/learningSubjects.ts`
- `src/features/learning/config/learningStages.ts`
- `src/features/learning/config/mathUnits.ts`
- `src/features/learning/config/learningItems.ts`
- `src/features/learning/config/learningDisplay.ts`

### C. 工具
- `src/features/learning/utils/learningFilters.ts`
- `src/features/learning/utils/learningAdapters.ts`

### D. 元件
- `src/features/learning/components/LearningHub.tsx`
- `src/features/learning/components/SubjectSection.tsx`
- `src/features/learning/components/StageSection.tsx`
- `src/features/learning/components/LearningItemCard.tsx`

## 11.2 修改檔案

### 核心
- [src/components/LearningArea.tsx](src/components/LearningArea.tsx)

### 相依
- [src/pages/ParentSettings.tsx](src/pages/ParentSettings.tsx)
- [src/lib/gameConfig.ts](src/lib/gameConfig.ts)

### 視情況
- [src/pages/ChildDashboard.tsx](src/pages/ChildDashboard.tsx)
  - 預期可不改，只要 `LearningArea` API 不變

---

## 12. 各檔案責任與修改內容

## 12.1 `src/components/LearningArea.tsx`

### 現況
- 直接從 `GAMES` 篩出 `category === 'learning'`
- 直接渲染單一 grid

### Phase 1 改動
- 改為讀取 learning module 的 item source
- 改為渲染 `LearningHub`
- 保留 `GameModal` 與獎勵流程

### 預計保留 API
```tsx
<LearningArea userId={userId} onGoHome={onGoHome} />
```

## 12.2 `src/pages/ParentSettings.tsx`

### 現況
- `GAMES.filter(g => g.category === 'learning')`

### Phase 1 改動
- 改讀 `getManageableLearningItems()` 之類的 helper
- 仍平鋪顯示 toggle row
- 只顯示已上線項目

## 12.3 `src/lib/gameConfig.ts`

### 現況
- 同時包含 fun / learning

### Phase 1 建議改動策略

#### 保守版（建議）
- 暫時保留 learning entries
- 但 `LearningArea` 與 `ParentSettings` 不再依賴這些 entries
- 待 Phase 1 穩定後再刪除

#### 激進版（不建議首波）
- 直接移除 learning entries
- 風險較高，容易影響其他未發現的依賴

**建議採保守版。**

---

## 13. 實作順序

## Step 1：建立型別與設定檔

### 目標
先把 learning module 的資料層定義完成。

### 產出
- learning subject types
- learning stage types
- learning item types
- math item types
- 既有學習項目設定

### 驗收
- 檔案可編譯
- 可由 config 匯出完整 learning items

## Step 2：建立 filter / adapter helper

### 目標
將 learning items 轉成 UI 與 `GameModal` 可使用的形式。

### 產出
- disabled 過濾
- subject/stage 排序
- manageable items flat list
- modal launcher adapter

### 驗收
- 不需要改 UI 也能在 console / 測試中驗證輸出結果

## Step 3：建立 `LearningHub` 與 section 元件

### 目標
將目前單一 grid 改為 section 化 UI。

### 產出
- subject section
- stage section
- item card component

### 驗收
- 語文與數學可分區顯示
- 數學可按學段分區顯示

## Step 4：接回 `LearningArea`

### 目標
保留 `LearningArea` 對外 API，但內部切換到新模組。

### 驗收
- `ChildDashboard` 不需大改
- 點卡片仍能正常開啟練習
- 練習獎勵仍正常

## Step 5：接回 `ParentSettings`

### 目標
家長端改讀新 learning source，但維持現有互動。

### 驗收
- 可以停用既有語文 / 數學項目
- 停用後孩子端會同步隱藏
- `disabled_games` 不需資料遷移

## Step 6：去除直接依賴 `GAMES` 的 learning 邏輯

### 目標
完成邏輯脫鉤。

### 驗收
- `LearningArea` 不再 import `GAMES`
- `ParentSettings` 的 learning 管理不再直接依賴 `GAMES`

---

## 14. 測試計畫

## 14.1 單元測試建議

可新增測試目標：
- learning item 過濾邏輯
- disabled item 套用
- subject / stage 排序
- adapter 產出的 modal payload 正確

### 建議檔案
```text
src/features/learning/__tests__/learningFilters.test.ts
src/features/learning/__tests__/learningAdapters.test.ts
```

## 14.2 元件測試建議

若已有 React Testing Library，可補：
- `LearningArea` 正確渲染 section
- 停用項目不顯示
- 點擊 item 會開啟 modal

## 14.3 手動驗收流程

### 孩子端
1. 開啟 `ChildDashboard`
2. 確認學習書桌仍出現
3. 確認英文 / 國語 / 數學有正確分區
4. 確認數學顯示為國小區塊
5. 點選任一既有數學卡片，確認 HTML 練習頁可開啟
6. 完成練習，確認獎勵流程仍正常

### 家長端
1. 開啟 `ParentSettings`
2. 關閉任一 learning item
3. 回到孩子端，確認該項目被隱藏
4. 重新開啟，確認恢復

---

## 15. 風險與對策

## 15.1 風險：學習區與家長設定使用不同資料來源

### 對策
- Phase 1 同時改 `LearningArea` 與 `ParentSettings`
- 不允許只有一邊切到新模組

## 15.2 風險：舊 id 對不上導致停用失效

### 對策
- 既有已上線 learning item 必須沿用原 id
- 增加 `legacyDisabledKey` 作為保險

## 15.3 風險：一次移除 `gameConfig.ts` learning entries 造成未知回歸

### 對策
- Phase 1 僅移除依賴，不先刪資料
- Phase 2 再清理 dead config

## 15.4 風險：國中數學區塊空白造成體驗怪異

### 對策
- 若無可用 item，先不顯示區塊

---

## 16. 建議 PR / Commit 切分

## PR 1：Learning module 基礎資料層
- 新增 types
- 新增 config
- 新增 filters / adapters
- 補測試

## PR 2：LearningArea 重構
- 新增 `LearningHub` 等元件
- 改寫 `LearningArea`
- 驗證孩子端顯示與開啟流程

## PR 3：ParentSettings 相容重構
- learning toggle list 改讀新 source
- 驗證 `disabled_games` 過濾

## PR 4：清理與收尾
- 視情況移除不再使用的 learning 依賴
- 文件補充

---

## 17. 驗收標準

### 結構驗收
- [x] `src/features/learning/` 模組建立完成
- [x] learning 型別與設定檔可正常匯入使用

### 孩子端驗收
- [x] `LearningArea` 不再依賴 `GAMES.filter(...learning...)`
- [x] 學習書桌可按學科顯示
- [x] 數學可按學段顯示
- [x] 點擊項目仍可開啟練習

### 家長端驗收
- [x] `ParentSettings` 可正確列出 learning items
- [x] disabled item 可立即影響孩子端顯示
- [x] 不需資料庫 migration 也能維持功能

### 相容性驗收
- [x] 現有 `akila_plus_test.html`、`multiplication_test.html`、`division_test.html`、`subtraction_test.html` 可正常啟動
- [x] 語文內容不受此次重構影響
- [x] `RewardTime` 不受影響

---

## 18. Phase 1 結束後的下一步

Phase 1 完成後，建議立刻進入以下工作之一：

### Option A：Phase 2 國小數學單元開發
優先做：
- 分數
- 因數與倍數
- 面積
- 周長

### Option B：家長控制升級
將 `disabled_games` 進一步拆成：
- learning subjects
- stages
- units

### Option C：建立 React 題目頁原型
先做 `MathPracticePage.tsx` prototype，作為後續新數學單元的共用容器

---

## 19. 最終建議

對這個專案來說，Phase 1 的核心不是「多加幾個數學卡片」，而是：

- 先把學習系統從遊戲系統中正確拆出
- 讓資料模型能描述學科、學段、單元
- 讓未來國小 / 國中數學擴充不再受 `gameConfig.ts` 限制

因此，**Phase 1 最佳實作策略是：架構先行、功能相容、資料不硬搬、UI 漸進重構。**

目前已進入 Phase 2 擴充期，下一步建議強化國中代數題型深度與錯題回顧機制。
