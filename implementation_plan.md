# 遊戲與學習功能開關控制 實作計畫

## 📋 功能概述
讓家長可以在後台控制「獎勵時間」和「學習書桌」區塊的顯示，以及控制每個個別遊戲/學習項目的開啟狀態。

## 🏗️ 架構設計

### 層級結構
```
家長設定
├── 🎮 獎勵遊戲區塊 (預設:開)
│   ├── 方塊衝刺
│   ├── 射擊遊戲
│   ├── 俄羅斯方塊 ...
│
└── 📚 學習書桌區塊 (預設:開)
    ├── 單字召喚術
    ├── 發音選單字
    ├── 加法練習 ...
```

### 邏輯
- 主開關**關閉** → 整個區塊不顯示
- 主開關**開啟** → 顯示區塊，但個別項目可獨立開/關

---

## 📊 資料庫變更

### 擴充 `family_settings` 表格
```sql
ALTER TABLE family_settings
ADD COLUMN IF NOT EXISTS fun_games_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS learning_area_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS disabled_games TEXT[] DEFAULT '{}';
```

**欄位說明:**
| 欄位 | 類型 | 預設 | 說明 |
|------|------|------|------|
| `fun_games_enabled` | BOOLEAN | true | 獎勵遊戲主開關 |
| `learning_area_enabled` | BOOLEAN | true | 學習書桌主開關 |
| `disabled_games` | TEXT[] | [] | 被禁用的遊戲 ID 陣列 |

---

## 🧩 TypeScript 類型更新

### `src/types/database.ts`
```typescript
export interface FamilySettings {
    // ... existing fields
    fun_games_enabled: boolean;
    learning_area_enabled: boolean;
    disabled_games: string[];  // e.g. ['tetris', 'snake', 'spelling']
}
```

---

## � UI 設計規範

### 設計風格: Pixel RPG (與現有一致)
- **主開關**: 大型 Toggle Switch + 標題
- **個別遊戲**: 兩欄清單 + 小型 Toggle
- **層級視覺**: 子項目內縮 + 灰底區塊

### 色彩
| 元素 | 開啟 | 關閉 |
|------|------|------|
| Toggle 開關 | `bg-green-500` | `bg-gray-300` |
| 遊戲卡片 | 正常顯示 | `opacity-50` |

### 互動規格
- Toggle 動畫: 150ms ease-out
- 主開關關閉時，子項目 Toggle 變為 disabled 狀態
- 儲存時自動顯示 Toast 訊息

---

## 📁 實作檔案清單

### 1. 資料庫腳本
- **檔案**: `supabase/add_game_permissions.sql`
- **內容**: ALTER TABLE 新增欄位

### 2. 類型定義
- **檔案**: `src/types/database.ts`
- **變更**: 擴充 `FamilySettings` 介面

### 3. 預設值
- **檔案**: `src/hooks/useFamilySettings.ts`
- **變更**: 更新 `DEFAULT_FAMILY_SETTINGS`

### 4. 家長設定頁面
- **檔案**: `src/pages/ParentSettings.tsx`
- **變更**: 新增「遊戲與學習管理」區塊

### 5. 獎勵區塊
- **檔案**: `src/components/RewardTime.tsx`
- **變更**: 依據設定過濾顯示的遊戲

### 6. 學習區塊
- **檔案**: `src/components/LearningArea.tsx`
- **變更**: 依據設定過濾顯示的學習項目

---

## 🔄 實作步驟

### Step 1: 資料庫變更
建立 SQL 腳本新增欄位。

### Step 2: 更新 TypeScript 類型
擴充 `FamilySettings` 介面。

### Step 3: 更新 Hook 預設值
在 `useFamilySettings.ts` 中加入新欄位預設值。

### Step 4: 修改家長設定畫面
在 `ParentSettings.tsx` 新增:
- 獎勵遊戲主開關 + 個別遊戲清單
- 學習書桌主開關 + 個別學習清單

### Step 5: 修改顯示邏輯
- `RewardTime.tsx`: 檢查 `fun_games_enabled` 和 `disabled_games`
- `LearningArea.tsx`: 檢查 `learning_area_enabled` 和 `disabled_games`

### Step 6: 測試與推送
確認設定儲存和顯示邏輯正確。

---

## ✅ 驗收標準
- [ ] 家長可在設定頁看到遊戲管理區塊
- [ ] 主開關可控制整個區塊顯示
- [ ] 個別開關可控制單一遊戲
- [ ] 設定儲存後立即生效
- [ ] 孩子端正確反映家長設定

---

## 🎲 骰子購買系統 (Dice Purchase System)

### 需求
- 使用星幣購買骰子
- 費率: 5 星幣 = 2 骰子 (2.5 星幣/骰)
- 允許自訂購買數量 (以 2 骰子為單位)
- 檢查餘額，不足時禁用按鈕

### 1. 資料庫函數 (RPC)
- **檔案**: `supabase/add_dice_purchase.sql`
- **函數**: `purchase_dice`
- **邏輯**:
  1. 檢查使用者餘額
  2. 扣除星幣
  3. 增加骰子數量
  4. 記錄交易 (可選)
  5. 回傳新的餘額與骰子數

### 2. 前端 Hook
- **檔案**: `src/hooks/useTowerProgress.ts`
- **Hook**: `usePurchaseDice`
- **用途**: 呼叫 RPC 並處理 UI 更新

### 3. UI 設計
- **位置**: Monster Tower 介面 -> 骰子數量顯示區旁或獨立按鈕
- **元件**: `DicePurchaseModal`
- **互動**:
  - `+` / `-` 按鈕調整購買組數 (1組 = 2骰 = 5幣)
  - 顯示總花費
  - 顯示剩餘星幣
  - 購買確認與動畫回饋
