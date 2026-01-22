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
