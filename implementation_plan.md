# Implementation Plan: 家庭設定與星幣兌換功能

## 功能概述

本次實作包含三個功能模組：
1. **父母叮嚀與星幣匯率設定** - 家長可在後台啟用/停用，並設定匯率
2. **全局首頁按鈕** - 在任何頁面都能一鍵回到首頁
3. **星幣兌換申請系統** - 孩子提交兌換申請，家長審核後扣款

---

## 📊 資料庫設計

### 新增表格：`family_settings`

```sql
CREATE TABLE family_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE UNIQUE,
  
  -- 父母叮嚀
  parent_message_enabled BOOLEAN DEFAULT false,
  parent_message TEXT DEFAULT '',
  
  -- 星幣匯率
  exchange_rate_enabled BOOLEAN DEFAULT false,
  star_to_twd_rate DECIMAL(10, 2) DEFAULT 1.00,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- RLS
ALTER TABLE family_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view own settings" ON family_settings
  FOR SELECT USING (true);

CREATE POLICY "Parents can update settings" ON family_settings
  FOR ALL USING (true);
```

### 新增表格：`exchange_requests`

```sql
CREATE TABLE exchange_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 申請人資料
  child_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  
  -- 兌換金額
  star_amount INTEGER NOT NULL CHECK (star_amount > 0),
  twd_amount DECIMAL(10, 2) NOT NULL,  -- 計算結果
  
  -- 狀態: pending -> approved/rejected
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- 審核資訊
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reject_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE exchange_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view requests" ON exchange_requests
  FOR SELECT USING (true);

CREATE POLICY "Children can create requests" ON exchange_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Parents can update requests" ON exchange_requests
  FOR UPDATE USING (true);

-- Index
CREATE INDEX idx_exchange_requests_family ON exchange_requests(family_id);
CREATE INDEX idx_exchange_requests_status ON exchange_requests(status);
```

---

## 🎨 UI/UX 設計規範

### 設計風格

根據現有專案的 **Pixel RPG + Cyberpunk** 主題，遵循：
- **Primary Color**: `pokeball-red` (#DC2626)
- **Secondary**: `deep-black` (#1A1A2E)
- **Accent**: `yellow-400` 用於星幣相關元素
- **Border Style**: `border-2 border-deep-black` + `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`

### Toggle Switch 元件規範

```
┌─────────────────────────────────────────┐
│  🔔 父母叮嚀                            │
│  ┌──────┐                               │
│  │ ON   │  ← Toggle Switch (48x24px)   │
│  └──────┘                               │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ (啟用後顯示的文字輸入框)         │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Toggle 狀態**:
- OFF: `bg-gray-300`
- ON: `bg-hp-green` (或 `bg-green-500`)
- 圓點: `w-5 h-5 rounded-full bg-white shadow transition-transform`

### Fixed Navigation 規範

根據 UX 最佳實踐：
- 使用 `fixed` 定位，避免與其他 fixed 元素重疊
- 加入 `safe-area-inset` 適配 iOS 底部
- 按鈕樣式: FAB (Floating Action Button)

```
位置: 右下角 (right-6 bottom-6)
大小: 56x56px (w-14 h-14)
樣式: 圓形 + 陰影 + 脈衝動畫
```

---

## 📁 檔案結構

```
src/
├── components/
│   ├── ToggleSwitch.tsx        # [新增] 通用 Toggle 開關
│   ├── HomeButton.tsx          # [新增] 固定首頁按鈕
│   ├── ExchangeRequestDialog.tsx # [新增] 兌換申請彈窗
│   ├── ChildDashboardWidgets.tsx # [修改] 動態讀取設定
│   └── ...
├── hooks/
│   ├── useFamilySettings.ts    # [新增] 家庭設定 CRUD
│   ├── useExchangeRequests.ts  # [新增] 兌換申請 CRUD
│   └── ...
├── pages/
│   ├── ParentSettings.tsx      # [修改] 加入設定區塊
│   ├── ParentApproval.tsx      # [修改] 加入兌換審核 Tab
│   └── ChildDashboard.tsx      # [修改] 加入兌換按鈕
└── types/
    └── database.ts             # [修改] 加入新類型
```

---

## 📝 實作步驟

### Phase 1: 資料庫遷移 (`supabase/add_family_features.sql`)

1. 建立 `family_settings` 表格
2. 建立 `exchange_requests` 表格
3. 設定 RLS 政策
4. 加入 Realtime 發布

### Phase 2: 通用元件

#### 2.1 ToggleSwitch 元件

```tsx
// src/components/ToggleSwitch.tsx
interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  disabled?: boolean;
}
```

#### 2.2 HomeButton 元件

```tsx
// src/components/HomeButton.tsx
// Fixed position FAB, 點擊後導航到角色選擇頁
// 使用 navigate('/') 或 navigate('/role')
```

### Phase 3: 家長設定頁面擴充

在 `ParentSettings.tsx` 新增兩個區塊：

```
┌─────────────────────────────────────┐
│ 📢 訊息與匯率設定                    │
├─────────────────────────────────────┤
│                                     │
│ 🔔 父母叮嚀  [Toggle: ON/OFF]       │
│ ┌─────────────────────────────────┐ │
│ │ 今天記得多喝水喔！               │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 💱 星幣匯率  [Toggle: ON/OFF]       │
│                                     │
│ 1 星 = [  10  ] TWD                 │
│                                     │
└─────────────────────────────────────┘
```

### Phase 4: 孩子首頁顯示

修改 `ChildDashboardWidgets.tsx`：
- 從 `family_settings` 讀取設定
- 若 `parent_message_enabled = true` → 顯示叮嚀卡片
- 若 `exchange_rate_enabled = true` → 顯示匯率卡片

### Phase 5: 星幣兌換流程

#### 5.1 孩子端 (`ChildDashboard.tsx`)

新增「兌換星幣」按鈕於星幣餘額區塊：

```
┌────────────────────────┐
│ ⭐ 可用星幣: 150       │
│                        │
│ [🔄 兌換成零用錢]      │  ← 點擊開啟 Dialog
└────────────────────────┘
```

**兌換 Dialog 流程**:
1. 顯示當前匯率 (1 星 = N 元)
2. 輸入想兌換的星幣數量
3. 即時顯示可得金額
4. 驗證: 不可超過目前餘額
5. 送出後顯示「已送出審核」

#### 5.2 家長端 (`ParentApproval.tsx`)

在現有的審核頁面新增 Tab：

```
┌───────────────┬───────────────┐
│ 📋 任務審核   │ 💰 兌換審核   │  ← 新 Tab
└───────────────┴───────────────┘
```

**兌換審核卡片**:
```
┌───────────────────────────────────────┐
│ 👦 小明 申請兌換                       │
│                                       │
│ ⭐ 50 星  →  💰 500 TWD               │
│                                       │
│ 📅 2026-01-31 21:30                   │
│                                       │
│     [❌ 拒絕]  [✅ 核准]               │
└───────────────────────────────────────┘
```

**審核邏輯**:
- **核准**: 
  1. 更新 `status = 'approved'`
  2. 寫入 `star_transactions` (type: 'spend', amount: -N)
  3. 刷新餘額
- **拒絕**: 
  1. 更新 `status = 'rejected'`
  2. 星幣不變

---

## ✅ 驗證清單

- [ ] Toggle 狀態儲存到資料庫
- [ ] 首頁按鈕在所有頁面可見且可點擊
- [ ] 孩子無法兌換超過餘額的星幣
- [ ] 家長核准後星幣正確扣除
- [ ] 家長拒絕後星幣不受影響
- [ ] 設定變更後, 孩子首頁即時反映

---

## 🔗 相關文件

- [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md) - 開發規範
- [supabase/star_transactions.sql](./supabase/star_transactions.sql) - 星幣交易表
- [supabase/fix_star_system.sql](./supabase/fix_star_system.sql) - 星幣修復腳本
