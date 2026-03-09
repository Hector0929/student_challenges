# 數學學習模式正式開發規格文件

## 1. 文件目的

本文件定義 Daily QuestMon 專案中的「數學學習模式（Math Learning Mode）」之產品範圍、資訊架構、模組設計、題型規格、開發分期與驗收標準。

此文件用途如下：
- 作為後續實作前的正式規格依據
- 協助區分國小與國中數學內容範圍
- 重新整理目前以 `gameConfig.ts` 管理學習項目的不合理結構
- 作為未來數學題庫、家長控制、學習進度追蹤的延伸基礎

---

## 2. 背景與問題定義

### 2.1 目前現況

目前學習書桌中的數學類內容主要包含：
- 加法
- 減法
- 乘法
- 除法

這些內容目前以單一遊戲項目註冊進 `src/lib/gameConfig.ts`，並在 `src/components/LearningArea.tsx` 中統一顯示。

### 2.2 目前架構問題

現行結構存在以下問題：

1. **學習內容與娛樂遊戲共用同一份設定來源**
   - `gameConfig.ts` 同時管理 fun games 與 learning games
   - 導致學習內容被視為「遊戲的一種」，不利於後續擴充

2. **缺乏學習領域層級**
   - 目前只有單一項目列表，沒有「數學 / 英文 / 國語」等領域分類
   - 也沒有「國小 / 國中」的學習分級

3. **缺乏題型與能力標籤**
   - 無法描述每個數學單元屬於哪個概念、年級、難度與題型

4. **缺乏可重用的學習模組設計**
   - 每個 HTML 遊戲頁各自維護出題與 UI
   - 容易造成邏輯分散、維護成本上升

5. **不利於未來做學習追蹤**
   - 若後續要加入答題紀錄、錯題統計、能力分析、家長報表，目前結構不足以支撐

### 2.3 本次重構目標

本次不直接進入開發，而是先定義一套可長期使用的數學學習模式規格，目標如下：

- 將數學內容從一般遊戲設定中拆出
- 重新建立「學習模組」概念
- 支援國小 / 國中分級
- 支援單元、題型、難度、顯示方式的正式定義
- 保留現有 HTML 練習頁可逐步遷移的彈性

---

## 3. 產品定位

### 3.1 定位

數學學習模式不是單純的「遊戲列表」，而是「可結構化擴充的學習系統」。

它應具備以下特性：
- 可依學科與年級分類
- 可管理學習單元與題型
- 可支援多種互動形式（純文字、圖像輔助、拖拉、配對）
- 可延伸到進度追蹤與家長控制

### 3.2 使用者

- **主要使用者**：孩子
- **管理者**：家長
- **後續管理面需求**：家長可控制可見單元、年級範圍、是否啟用進階內容

### 3.3 適用學段

#### 國小範圍（第一優先）
- 四則運算進階
- 分數
- 因數與倍數
- 周長
- 面積
- 體積

#### 國中範圍（第二優先）
- 一元一次方程式
- 多項式基礎

---

## 4. 範圍定義

### 4.1 本階段納入範圍

#### 國小單元
- 加法
- 減法
- 乘法
- 除法
- 分數
- 因數與倍數
- 周長
- 面積
- 體積

#### 國中單元
- 一元一次方程式
- 多項式基礎

### 4.2 本階段不納入範圍

以下內容不列入第一輪開發：
- 幾何證明
- 聯立方程式
- 二次方程式
- 函數圖形
- 坐標幾何
- 機率與統計完整單元
- 高互動動畫教具編輯器
- 後台題庫 CMS

---

## 5. 核心設計原則

### 5.1 學習優先，不是遊戲優先
- 數學模式的核心是概念學習與練習
- 遊戲化元素是輔助，不應凌駕教學清晰度

### 5.2 先建立共用練習框架，再擴單元
- 先做統一的題目流程、難度、結算、錯題回顧
- 再將各數學單元接上共用框架

### 5.3 先做題型一致，再做互動特化
- 首版應優先統一 UI 與規則
- 圖像化或拖拉式互動可作為第二階段增強

### 5.4 內容應可分級
- 同一學科需支援學段分層
- 國小與國中題目不可混在同一層級中展示

### 5.5 支援逐步遷移
- 現有 `akila_plus_test.html`、`multiplication_test.html`、`division_test.html`、`subtraction_test.html` 可先保留
- 新模組建立後，再決定要逐步整併或保留雙軌

---

## 6. 建議資訊架構

### 6.1 學習系統層級

```text
Learning Hub
├── 語文學習
│   ├── 單字
│   ├── 發音
│   ├── 句子
│   └── 成語
│
└── 數學學習
    ├── 國小
    │   ├── 數與運算
    │   │   ├── 加法
    │   │   ├── 減法
    │   │   ├── 乘法
    │   │   ├── 除法
    │   │   ├── 分數
    │   │   └── 因數與倍數
    │   └── 幾何與測量
    │       ├── 周長
    │       ├── 面積
    │       └── 體積
    │
    └── 國中
        ├── 代數
        │   ├── 一元一次方程式
        │   └── 多項式基礎
        └── 幾何與其他
```

### 6.2 UI 層級建議

孩子端的學習入口建議改為：

```text
學習書桌
├── 語文
└── 數學
    ├── 國小數學
    └── 國中數學
```

點入後再顯示單元卡片，而不是在第一層直接把所有數學項目與語文項目平鋪混在一起。

---

## 7. 模組重構提案

### 7.1 結論

**建議新增獨立的學習模組，不再讓數學學習模式直接依附於 `src/lib/gameConfig.ts`。**

### 7.2 為什麼 `gameConfig.ts` 不再適合

`gameConfig.ts` 適合描述：
- 可啟動的遊戲項目
- 單一入口卡片
- URL 導向
- 顏色與 icon

但不適合描述：
- 學科領域
- 年級範圍
- 教學單元
- 題型規則
- 題目生成器
- 學習能力標籤
- 錯題追蹤
- 家長權限控制到「學段 / 單元」層級

### 7.3 新模組建議

建議新增以下檔案結構：

```text
src/
└── features/
    └── learning/
        ├── config/
        │   ├── learningSubjects.ts
        │   ├── mathCurriculum.ts
        │   ├── mathUnits.ts
        │   └── learningDisplay.ts
        ├── types/
        │   ├── learning.ts
        │   └── math.ts
        ├── components/
        │   ├── LearningHub.tsx
        │   ├── SubjectSection.tsx
        │   ├── StageSection.tsx
        │   ├── UnitCard.tsx
        │   └── MathPracticeLauncher.tsx
        ├── engines/
        │   ├── questionGenerators/
        │   ├── answerCheckers/
        │   └── hintBuilders/
        └── pages/
            └── MathPracticePage.tsx
```

### 7.4 與既有系統的關係

#### 保留
- `GameModal.tsx` 可先保留作為練習容器
- 現有 HTML 題目頁可先持續使用

#### 逐步替換
- `LearningArea.tsx` 後續改讀取 learning module 的設定來源
- `gameConfig.ts` 只保留娛樂遊戲與仍需以 game card 呈現的內容
- 數學與語文學習配置移出 `gameConfig.ts`

### 7.5 過渡期建議

第一階段不要一次全搬：
1. 先建立新 learning module 與資料結構
2. 先讓數學新單元走新模組
3. 舊四則運算暫時保留原 HTML 頁
4. 視穩定度再決定是否將舊數學頁也遷移進新模組

---

## 8. 資料模型規格

### 8.1 學習科目（Subject）

```ts
interface LearningSubject {
  id: 'math' | 'english' | 'chinese';
  name: string;
  icon: string;
  description: string;
  enabled: boolean;
  order: number;
}
```

### 8.2 學段（Stage）

```ts
interface LearningStage {
  id: 'elementary' | 'junior_high';
  name: string;
  description: string;
  order: number;
}
```

### 8.3 數學單元（Math Unit）

```ts
type MathDomain =
  | 'number_operations'
  | 'fractions'
  | 'factors_multiples'
  | 'measurement'
  | 'geometry'
  | 'algebra';

interface MathUnit {
  id: string;
  subjectId: 'math';
  stageId: 'elementary' | 'junior_high';
  domain: MathDomain;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  grades: string[];
  difficultyLevels: ('easy' | 'medium' | 'hard')[];
  supportsVisualAid: boolean;
  practiceModes: string[];
  launcherType: 'html' | 'react';
  launchTarget: string;
  enabledByDefault: boolean;
  order: number;
}
```

### 8.4 題型（Practice Mode）

```ts
interface PracticeModeDefinition {
  id: string;
  unitId: string;
  name: string;
  description: string;
  answerType: 'single_choice' | 'integer_input' | 'fraction_input' | 'expression_input' | 'drag_drop';
  visualType?: 'none' | 'fraction_bar' | 'area_grid' | 'solid_blocks';
}
```

---

## 9. 數學單元正式規格

## 9.1 國小數學

### A. 加法
- **學段**：國小
- **領域**：數與運算
- **首版定位**：保留既有內容
- **後續可擴充**：直式加法、進位、應用題

### B. 減法
- **學段**：國小
- **領域**：數與運算
- **首版定位**：保留既有內容
- **後續可擴充**：退位、直式、應用題

### C. 乘法
- **學段**：國小
- **領域**：數與運算
- **首版定位**：保留既有內容
- **後續可擴充**：二位數乘法、分配律前導

### D. 除法
- **學段**：國小
- **領域**：數與運算
- **首版定位**：保留既有內容
- **後續可擴充**：長除法、商與餘數應用

### E. 分數
- **學段**：國小
- **領域**：分數
- **優先等級**：最高
- **首批題型**：
  - 真分數 / 假分數辨識
  - 分子分母判讀
  - 約分
  - 擴分
  - 同分母分數加減
  - 異分母分數基礎加減
- **視覺支援**：
  - 分數條
  - 分割圓或長條圖
- **難度定義**：
  - easy：分數辨識、同分母比較
  - medium：約分、擴分、同分母加減
  - hard：異分母加減、假分數轉帶分數

### F. 因數與倍數
- **學段**：國小
- **領域**：因數與倍數
- **優先等級**：最高
- **首批題型**：
  - 判斷某數是否為另一數的因數
  - 判斷某數是否為另一數的倍數
  - 列出因數
  - 列出倍數
  - 最大公因數（基礎）
  - 最小公倍數（基礎）
- **難度定義**：
  - easy：因數 / 倍數判斷
  - medium：列舉與配對
  - hard：GCF / LCM 基礎

### G. 周長
- **學段**：國小
- **領域**：幾何與測量
- **優先等級**：高
- **首批題型**：
  - 正方形周長
  - 長方形周長
  - 已知邊長求周長
  - 基礎複合圖形周長
- **視覺支援**：
  - 圖形標邊
  - 高亮外框
- **難度定義**：
  - easy：正方形、長方形
  - medium：缺一邊推回周長
  - hard：複合圖形基礎

### H. 面積
- **學段**：國小
- **領域**：幾何與測量
- **優先等級**：最高
- **首批題型**：
  - 正方形面積
  - 長方形面積
  - 三角形面積
  - 平行四邊形面積
  - 數方格求面積
- **視覺支援**：
  - 方格底圖
  - 面積覆蓋顯示
- **難度定義**：
  - easy：長方形 / 正方形
  - medium：數格子與單位面積
  - hard：三角形 / 平行四邊形

### I. 體積
- **學段**：國小
- **領域**：測量
- **優先等級**：中高
- **首批題型**：
  - 正方體體積
  - 長方體體積
  - 數小立方體求體積
- **視覺支援**：
  - 小立方體堆疊示意
- **難度定義**：
  - easy：正方體
  - medium：長方體
  - hard：拆分組合體基礎

## 9.2 國中數學

### J. 一元一次方程式
- **學段**：國中
- **領域**：代數
- **優先等級**：第二階段
- **首批題型**：
  - $x + a = b$
  - $x - a = b$
  - $ax = b$
  - $\frac{x}{a} = b$
  - $ax + b = c$
- **首版不納入**：
  - 含括號方程式
  - 含分數係數方程式
  - 文字應用題多步驟
- **難度定義**：
  - easy：一步驟
  - medium：兩步驟
  - hard：含移項概念的變形

### K. 多項式基礎
- **學段**：國中
- **領域**：代數
- **優先等級**：第三階段
- **首批題型**：
  - 辨識同類項
  - 合併同類項
  - 單項式代入求值
  - 多項式加減基礎
- **首版不納入**：
  - 乘法公式
  - 因式分解
  - 高階代數操作
- **難度定義**：
  - easy：辨識與分類
  - medium：合併同類項
  - hard：加減混合與代入

---

## 10. 題目引擎規格

### 10.1 共用出題原則
- 每單元題目需可隨機生成
- 首版每單元至少能生成 30 至 50 組不重複題目變體
- 題目需避免在短時間內重複出現完全相同組合
- 題目答案需可程式化驗證

### 10.2 題目結構建議

```ts
interface MathQuestion {
  id: string;
  unitId: string;
  modeId: string;
  prompt: string;
  expression?: string;
  choices?: string[];
  answer: string | number;
  explanation?: string;
  hint?: string;
  visualPayload?: Record<string, unknown>;
}
```

### 10.3 驗證規則
- 單一數值答案：完全一致
- 分數答案：需支援約分後等值判定
- 代數答案：需做格式正規化後比對
- 多項式首版如需輸入式答案，應限制格式，避免自由輸入過早複雜化

### 10.4 錯題回饋規則
- 錯誤時顯示「哪個概念錯」而非只顯示紅叉
- 可提供 1 句提示，不直接給完整答案
- 結算頁需列出答錯題與正解

---

## 11. 練習流程規格

### 11.1 共用流程

```text
單元卡片
→ 難度選擇
→ 題型選擇（可選）
→ 開始練習
→ 題目作答循環
→ 結算
→ 錯題回顧
→ 再玩一次 / 返回單元列表
```

### 11.2 每回合建議設定
- 題數模式：10 題 / 15 題
- 或時間模式：60 秒 / 90 秒
- 首版建議優先沿用目前孩子熟悉的計時模式

### 11.3 結算畫面應包含
- 正確題數
- 連擊或答對率
- 是否獲得練習獎勵
- 錯題摘要
- 再挑戰按鈕

---

## 12. UI / UX 規格

### 12.1 首版共用 UI 原則
- 題目字級需大且適合平板 / 手機
- 操作按鈕需可單手點擊
- 顏色依單元區分，但排版結構維持一致
- 題目上方需顯示概念標籤，例如：`分數約分`、`長方形面積`

### 12.2 視覺輔助優先順序
1. 分數圖像
2. 面積方格圖
3. 體積小立方體圖
4. 周長標邊圖
5. 方程式步驟提示

### 12.3 行動裝置要求
- 支援窄螢幕
- 避免橫向捲動
- 數字輸入需優先使用數字鍵盤友善方案

---

## 13. 家長控制與權限規格

### 13.1 家長控制目標
未來家長可控制：
- 是否顯示數學學習區
- 是否顯示國小數學 / 國中數學
- 是否停用特定單元
- 是否只開放指定學段

### 13.2 本次文件先定義、暫不強制實作
建議未來設定模型支援：

```ts
interface LearningPreferences {
  learningEnabled: boolean;
  enabledSubjects: string[];
  enabledStages: string[];
  disabledUnitIds: string[];
}
```

---

## 14. 技術架構建議

### 14.1 首版技術策略
採用雙軌制：
- **既有內容**：保留 HTML 題目頁
- **新內容**：優先用新 learning module 管理

### 14.2 實作策略 A：最小風險
- 新增數學學習模組設定層
- 先只把新單元掛入新模組
- 啟動後仍可透過 `GameModal` 打開 HTML 或 React 頁面

### 14.3 實作策略 B：中期理想型
- 建立 React 版通用數學練習頁 `MathPracticePage.tsx`
- 出題器與檢核器集中管理
- 新單元全面改用 React 練習頁
- 舊四則運算視情況逐步搬遷

### 14.4 建議採用方案
**建議先走策略 A，再演進到策略 B。**

理由：
- 風險最低
- 可與現有功能共存
- 可先快速上線新數學單元
- 未來有足夠彈性整合舊內容

---

## 15. 檔案規劃建議

### 15.1 首階段新增檔案

```text
src/features/learning/types/learning.ts
src/features/learning/types/math.ts
src/features/learning/config/learningSubjects.ts
src/features/learning/config/mathUnits.ts
src/features/learning/config/mathCurriculum.ts
src/features/learning/components/LearningHub.tsx
src/features/learning/components/StageSection.tsx
src/features/learning/components/UnitCard.tsx
```

### 15.2 第二階段新增檔案

```text
src/features/learning/engines/questionGenerators/fractions.ts
src/features/learning/engines/questionGenerators/factorsMultiples.ts
src/features/learning/engines/questionGenerators/area.ts
src/features/learning/engines/questionGenerators/perimeter.ts
src/features/learning/engines/questionGenerators/volume.ts
src/features/learning/engines/questionGenerators/linearEquation.ts
src/features/learning/engines/questionGenerators/polynomials.ts
src/features/learning/pages/MathPracticePage.tsx
```

### 15.3 舊檔案調整方向
- `src/components/LearningArea.tsx`：改為讀取 learning module，而非直接從 `GAMES` 篩選所有 learning 類型
- `src/lib/gameConfig.ts`：未來只保留真正的遊戲與過渡期項目

---

## 16. 開發分期

## Phase 0：規格確認（本文件）
- 確認國小 / 國中範圍
- 確認模組重構方向
- 確認首批單元優先序

## Phase 1：學習模組骨架
- 建立 learning module 類型與設定檔
- 重構學習書桌入口資訊架構
- 支援國小 / 國中分組展示

## Phase 2：首批國小數學單元
- 分數
- 因數與倍數
- 面積
- 周長

## Phase 3：國小擴充單元
- 體積
- 舊四則運算整合或重掛接

## Phase 4：國中數學第一批
- 一元一次方程式

## Phase 5：國中數學第二批
- 多項式基礎

## Phase 6：強化功能
- 錯題追蹤
- 學習紀錄
- 家長篩選與報表
- 圖像題增強

---

## 17. 首批實作優先順序

### 建議 MVP
1. 分數
2. 因數與倍數
3. 面積
4. 周長

### 第二批
5. 體積
6. 一元一次方程式

### 第三批
7. 多項式基礎

### 原因
- 分數、因數倍數、面積、周長最符合現階段國小內容擴充需求
- 題型清楚、教育價值高、可快速做出明顯差異
- 一元一次方程式與多項式屬國中內容，應在資訊架構上明確分流

---

## 18. 驗收標準

### 18.1 結構驗收
- [ ] 學習系統可區分數學與語文
- [ ] 數學系統可區分國小與國中
- [ ] 數學單元不再必須依附 `gameConfig.ts` 才能存在

### 18.2 功能驗收
- [ ] 首批數學單元可在學習書桌中正確顯示
- [ ] 每個單元可正確啟動練習
- [ ] 難度與題型可配置
- [ ] 結算與獎勵流程可沿用現有機制

### 18.3 教學驗收
- [ ] 題目符合學段
- [ ] 提示內容可幫助理解而非只是告知對錯
- [ ] 錯題可於結束後回顧

### 18.4 延展性驗收
- [ ] 未來可再加入新單元而不必修改 `gameConfig.ts` 主結構
- [ ] 未來可支援家長對學段 / 單元做權限控制
- [ ] 未來可支援學習紀錄與報表

---

## 19. 風險與注意事項

### 19.1 風險
- 若一開始就全面把舊數學頁搬進新系統，改動面過大
- 若過早做高自由度輸入（例如多項式文字輸入），驗證複雜度會快速上升
- 若不先定義學段與單元模型，後續家長控制會變得零散

### 19.2 對策
- 採雙軌過渡
- 先從國小單元開始
- 先做答案格式受控的題型
- 先建資料模型，再做 UI 實作

---

## 20. 最終建議結論

### 20.1 架構結論
- **應建立新的 learning module**
- **不建議再把數學學習內容單純塞進 `gameConfig.ts`**

### 20.2 內容結論
- **國小數學**：分數、因數與倍數、面積、周長、體積為主要擴充方向
- **國中數學**：一元一次方程式、多項式基礎需獨立標示為國中內容

### 20.3 開發結論
- 先做模組骨架與資訊架構
- 再做首批四個國小單元
- 國中內容放第二階段，避免與國小內容混在一起造成體驗混亂

---

## 21. 建議下一步

建議下一份實作文件直接拆成以下三份：

1. **資訊架構與 UI wireframe 文件**
   - 學習書桌入口
   - 數學首頁
   - 國小 / 國中分流
   - 單元卡片區

2. **技術實作計畫文件**
   - 哪些檔案要新增
   - 哪些檔案要修改
   - 分幾個 PR / Sprint 做

3. **首批單元題型設計文件**
   - 分數題型細規
   - 因數倍數題型細規
   - 面積題型細規
   - 周長題型細規

如果本文件確認無誤，下一步應開始撰寫「Phase 1 技術實作計畫」，並明確定義新 learning module 的 TypeScript 型別與檔案結構。
