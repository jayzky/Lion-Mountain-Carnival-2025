-- 务必在 Supabase 的 SQL Editor 中运行此代码！
-- 用途：添加 missing 的 'game' 字段，修复“找不到列”的报错。

-- 1. 添加 game 字段（如果不存在）
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS game text DEFAULT 'Speed Run';

-- 2. 刷新 Schema 缓存 (解决 schema cache 报错的关键)
NOTIFY pgrst, 'reload config';

-- 3. 检查是否成功 (运行后查看结果栏应有 game 列)
SELECT * FROM leaderboard LIMIT 1;
