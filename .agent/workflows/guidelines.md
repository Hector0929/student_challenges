---
description: 專案開發指導原則 - Daily QuestMon 每日任務系統
---

# Daily QuestMon 開發指導原則

## 🌏 時區設定
- **所有日期處理必須使用台灣時區 (Asia/Taipei)**
- 使用 `getTodayDate()` 函數（在 `src/lib/supabase.ts`）來獲取今天的日期
- **禁止**直接使用 `new Date().toISOString().split('T')[0]`，這會返回 UTC 日期

```typescript
// ✅ 正確
import { getTodayDate } from '../lib/supabase';
const today = getTodayDate(); // 台灣時區的 YYYY-MM-DD

// ❌ 錯誤
const today = new Date().toISOString().split('T')[0]; // UTC 時區
```

## 📊 資料庫查詢
- **避免 Inner Join**：使用 `select('*')` 而不是 `select('*, table!fk(*)')`
- Inner Join (`!`) 會導致關聯資料不存在時整條記錄被過濾掉
- 如需關聯資料，分開查詢或使用 Left Join

```typescript
// ✅ 正確 - 簡單查詢
.select('*')

// ⚠️ 小心 - Inner Join，關聯不存在會過濾記錄
.select('*, quests!quest_id(*)')
```

## 🔄 React Query 緩存刷新
- 使用 `refetchType: 'all'` 確保所有匹配的查詢都被刷新
- 使用較短的 queryKey prefix 來匹配多個查詢

```typescript
// ✅ 正確
queryClient.invalidateQueries({ 
    queryKey: ['daily_logs'],
    refetchType: 'all'
});

// ❌ 可能不完整
queryClient.invalidateQueries({ queryKey: ['daily_logs', userId] });
```

## 🔌 Supabase Realtime
- 確保表格已加入 `supabase_realtime` 發布（執行 `supabase/enable_realtime.sql`）
- 訂閱狀態應該顯示 `SUBSCRIBED`，如果是 `CLOSED` 表示連線失敗
- 使用 `supabase.removeChannel()` 正確清理訂閱

## 🔐 RLS 策略
- 開發/測試時使用寬鬆策略 (`USING (true)`)
- 生產環境應該根據 `auth.uid()` 限制存取
- RLS 修復腳本：`supabase/fix_approval_rls.sql`

## 📝 任務狀態流程
```
pending → completed → verified
   ↑         ↓
   └── rejected (回到 pending)
```

- `pending`：任務可點擊
- `completed`：等待家長審核，不可點擊
- `verified`：已完成，不可點擊

## 🧪 調試工具
- `scripts/test_db_sync.js`：測試資料庫連線和 RLS 策略
- `supabase/reset_daily_logs.sql`：重置任務進度（清除 daily_logs）

## 🚀 環境變數
必須在 `.env` 中設定：
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_FAMILY_PASSWORD=家庭登入密碼
VITE_PARENT_PASSWORD=家長控制密碼
```
