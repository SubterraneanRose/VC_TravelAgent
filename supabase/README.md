# Supabase 数据库设置说明

## 1. 创建 Supabase 项目

1. 访问 https://supabase.com 并登录
2. 点击 "New project" 创建新项目
3. 填写项目名称、数据库密码、选择地区
4. 等待项目初始化完成（约 2-3 分钟）

## 2. 获取 API 配置

1. 进入项目后，点击左侧菜单 "Settings" → "API"
2. 复制以下信息到 `.env.local`：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**注意**：必须使用 `NEXT_PUBLIC_` 前缀，因为 Supabase 客户端在浏览器中运行。不要使用 `SUPABASE_URL`（那是服务器端专用的）。

## 3. 执行数据库迁移

**重要**：请按顺序执行所有迁移文件，不要跳过任何文件。

### 迁移文件列表

1. **001_initial_schema.sql** - 初始表结构
   - 创建 `trips` 表（行程主表）
   - 创建 `day_plans` 表（每日计划）
   - 创建 `plan_items` 表（计划项：景点/餐饮/住宿/交通）
   - 创建 `expenses` 表（费用记录）
   - 创建索引和 RLS 策略

2. **002_add_origin_destination.sql** - 添加起点和终点字段
   - 在 `trips` 表中添加 `origin` 字段（出发地/起点）
   - 在 `trips` 表中添加 `destination_end` 字段（终点）

3. **003_add_people_field.sql** - 添加人数字段
   - 在 `trips` 表中添加 `people` 字段（同行人数，默认 2）

### 执行步骤

1. 在 Supabase 控制台，点击左侧菜单 "SQL Editor"
2. 点击 "New query"
3. 依次执行每个迁移文件：
   - 复制迁移文件的全部内容
   - 粘贴到 SQL Editor 中
   - 点击 "Run" 执行 SQL
   - 确认执行成功（显示 "Success"）
4. 重复步骤 3，直到所有迁移文件都执行完成

## 4. 配置 RLS（行级安全）

当前迁移脚本已创建允许所有操作的策略（用于开发测试）。

**生产环境建议**：接入 Supabase Auth 后，修改策略为基于 `user_id` 的权限控制：

```sql
-- 示例：只允许用户访问自己的行程
DROP POLICY "Allow all for trips" ON public.trips;
CREATE POLICY "Users can manage own trips" 
  ON public.trips 
  FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);
```

## 5. 验证

1. 在 Supabase 控制台，点击 "Table Editor"
2. 应该能看到 `trips`、`day_plans`、`plan_items`、`expenses` 表
3. 在应用中访问 `/new` 页面，创建一条测试行程
4. 访问 `/trips` 页面，应该能看到刚创建的行程

## 注意事项

- 当前 RLS 策略允许所有操作，仅用于开发测试
- 生产环境必须配置基于用户身份的 RLS 策略
- 不要将 `service_role` key 暴露到前端代码中

