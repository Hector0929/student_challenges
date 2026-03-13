# 数据库迁移说明

## 问题描述
当前代码中使用了 `quests.status` 字段来过滤任务，但数据库 schema 中只有 `is_active` 字段。这导致：
- 任务完成后无法正确保存到 `daily_logs` 表（外键约束失败）
- 查询可能返回空结果或错误

## 解决方案
需要在 Supabase 数据库中添加 `status` 字段。

## 迁移步骤

### 1. 登录 Supabase Dashboard
访问 [supabase.com](https://supabase.com) 并登录你的项目

### 2. 打开 SQL Editor
在左侧菜单中选择 "SQL Editor"

### 3. 运行迁移脚本
复制并运行 `add_quest_status.sql` 文件中的内容：

```sql
-- Add status column to quests table
ALTER TABLE quests 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
CHECK (status IN ('active', 'pending', 'archived'));

-- Migrate existing data
UPDATE quests 
SET status = CASE 
  WHEN is_active = true THEN 'active'
  ELSE 'archived'
END
WHERE status IS NULL OR status = 'active';

-- Create index
CREATE INDEX IF NOT EXISTS idx_quests_status ON quests(status);

-- Update RLS policy
DROP POLICY IF EXISTS "Active quests are viewable by everyone" ON quests;
CREATE POLICY "Quests are viewable by everyone" ON quests
  FOR SELECT USING (true);
```

### 4. 验证迁移
运行以下查询确认 status 字段已添加：

```sql
SELECT id, title, is_active, status FROM quests LIMIT 10;
```

## 向后兼容
代码已更新为同时支持 `status` 和 `is_active` 字段，即使未运行迁移脚本，应用仍可正常工作（使用 is_active 作为 fallback）。

## 注意事项
- `is_active` 字段保留用于向后兼容
- 新功能应使用 `status` 字段
- 三种状态：
  - `active`: 活跃任务（孩子可以看到并完成）
  - `pending`: 待审核任务（孩子提出的新任务请求）
  - `archived`: 已归档任务（不再显示）

---

## 星幣系統遷移（必跑）

若你遇到 `star_transactions` 寫入 400、`type` 不合法、或星幣餘額計算不一致，請再執行：

- [supabase/migrate_star_transactions_v2.sql](migrate_star_transactions_v2.sql)

此腳本會：
1. 統一 `star_transactions` 欄位與 constraint
2. 支援 `earn/spend/adjustment/correction`
3. 重建 `get_child_star_balance()` 為「任務已驗證 + 交易淨和」
4. 補齊 RLS policy 與 realtime 發佈

### 驗證 SQL

```sql
-- 1) 檢查 type 約束
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'star_transactions'::regclass
  AND conname = 'star_transactions_type_check';

-- 2) 測試加星幣（請換成真實 child id）
INSERT INTO star_transactions (user_id, amount, type, description, game_id)
VALUES ('00000000-0000-0000-0000-000000000000', 100, 'adjustment', 'migration test', 'qa_tool');

-- 3) 檢查餘額函式（請換成真實 child id）
SELECT get_child_star_balance('00000000-0000-0000-0000-000000000000'::uuid);
```

---

## 世界系統 RLS 修正（補給站/銀行/兌換必跑）

若你在孩子頁購買建材補給、兌換資源或操作世界銀行時看到 `403 Forbidden`，
而錯誤訊息包含 `new row violates row-level security policy for table "world_states"`、
`world_inventory`、`world_characters`、`world_bank_accounts` 等，請再執行：

- [supabase/fix_world_rls_for_family_parents.sql](fix_world_rls_for_family_parents.sql)

此腳本會：
1. 保留本人可管理自己的世界資料
2. 允許同家庭 `parent` 帳號代孩子管理世界/金融資料
3. 修正 `world_states`、`world_buildings`、`world_inventory`、`world_characters`、`world_adventures`
4. 修正 `world_bank_accounts`、`world_time_deposits`、`world_exchange_logs`

### 前置條件

若你執行時看到 `relation "world_bank_accounts" does not exist`、
`relation "world_states" does not exist` 這類錯誤，代表世界系統資料表尚未建立。

請先依序執行：

- [supabase/add_world_system.sql](add_world_system.sql)
- [supabase/add_world_finance.sql](add_world_finance.sql)

再執行：

- [supabase/fix_world_rls_for_family_parents.sql](fix_world_rls_for_family_parents.sql)

目前 `fix_world_rls_for_family_parents.sql` 已改成會自動跳過不存在的資料表，
但若你希望補給站、世界銀行、定存與兌換完整可用，仍需要先建立上述 world tables。

### 驗證方式

1. 重新整理孩子頁並打開世界商店街
2. 購買一次 `木材補給` / `石材補給` / `晶礦補給`
3. 確認 Console 不再出現上述 world tables 的 `403`
4. 確認資源數量與星幣餘額都有更新
