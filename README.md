# VC_TravelAgent
Github链接：https://github.com/SubterraneanRose/VC_TravelAgent/tree/main
基于 Next.js + TypeScript + Ant Design 的 Web 版 AI 旅行规划师。

## 功能特性

- ✨ **智能行程生成**：基于 LLM 自动生成详细的旅行行程计划
- 🎯 **景点价格查询**：自动查询景点门票价格，提供准确的费用估算
- 🗺️ **地图可视化**：在地图上显示景点、餐饮、住宿位置（支持中国境内）
- 💰 **预算管理**：智能分配预算，支持费用记录和预算对比
- 👥 **多人出行**：支持设置同行人数，费用按人数自动计算
- 📅 **日期限制**：单次行程最多 10 天，确保生成完整详细的行程

## 快速开始（本地）

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制环境变量模板：

```bash
cp env.example .env.local
```

在 `.env.local` 中填写以下配置：

#### 必需配置

```env
# Supabase 配置（必需）
NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase anon key

# LLM 配置（必需，用于行程生成）
LLM_PROVIDER=aliyun-bailian
LLM_API_KEY=你的LLM API Key
```

#### 可选配置

```env
# 高德地图配置（可选，用于地图显示和地理编码）
NEXT_PUBLIC_AMAP_API_KEY=你的高德地图JS API Key
NEXT_PUBLIC_AMAP_WEB_SERVICE_KEY=你的高德地图Web服务Key（推荐单独配置）
```

**获取 API Key：**
- **Supabase**：参考 `supabase/README.md`
- **高德地图**：访问 [高德开放平台](https://lbs.amap.com/) 申请
- **LLM（阿里云百炼）**：访问 [阿里云百炼](https://bailian.console.aliyun.com/) 申请

### 3. 执行数据库迁移

1. 在 Supabase 控制台，点击 "SQL Editor"
2. 依次执行以下迁移文件（按顺序）：
   - `supabase/migrations/001_initial_schema.sql` - 创建基础表结构
   - `supabase/migrations/002_add_origin_destination.sql` - 添加起点和终点字段
   - `supabase/migrations/003_add_people_field.sql` - 添加人数字段

详细说明请参考 `supabase/README.md`

### 4. 启动开发服务器

```bash
npm run dev
```

### 5. 访问应用

在浏览器中打开 http://localhost:3000

## Docker 运行

### 构建镜像

```bash
docker build -t vc-travel-agent .
```

### 运行容器

```bash
docker run -p 3000:3000 --env-file .env.local vc-travel-agent
```

## 使用说明

### 创建行程

1. 点击首页的"立即开始"或访问 `/new` 页面
2. 填写行程信息：
   - **出发地/起点**：您的出发城市（可选）
   - **目的地**：旅行目的地（必需）
   - **终点**：返程地点（可选，如果与出发地不同）
   - **日期范围**：选择出发和结束日期（最多 10 天）
   - **预算**：总预算金额（可选）
   - **同行人数**：出行人数（默认 2 人）
   - **旅行偏好**：选择您的兴趣偏好（可多选）
3. 点击"创建行程"

### 生成行程计划

1. 在行程详情页面，点击"生成行程计划"按钮
2. 系统会：
   - 自动查询景点门票价格
   - 基于实际价格生成详细行程
   - 合理分配时间和费用
3. 等待生成完成（通常需要 30-60 秒）

### 查看地图

- 行程生成后，会自动在地图上显示所有地点标记
- 支持按日期筛选显示
- **注意**：高德地图主要支持中国境内地址，外国城市的地点可能无法显示

### 删除行程

- 在行程列表页面，点击行程卡片的"删除"按钮
- 在行程详情页面，点击"删除行程"按钮
- 删除操作会同时删除所有相关的行程计划和费用记录

## 重要限制和提示

### 行程天数限制

- **单次行程最多 10 天**：为了确保 AI 能够生成完整详细的行程，系统限制单次行程不超过 10 天
- 如果您的行程超过 10 天，建议拆分为多个行程分别规划

### 地图支持范围

- **高德地图主要支持中国境内地址**的地理编码
- 外国城市（如日本、俄罗斯、欧洲等）的地点可能无法在地图上显示标记点
- 系统会自动检测并提示您

### 价格估算说明

- 所有费用均为估算价格，实际价格可能因时间、季节、预订渠道等因素而有所不同
- 景点门票价格通过 LLM 查询获取，但可能不完全准确
- 航班和酒店价格波动较大，建议在实际预订前查询实时价格

## 技术栈

- **前端框架**：Next.js 14（App Router）
- **语言**：TypeScript
- **UI 组件库**：Ant Design 5
- **数据库**：Supabase (PostgreSQL)
- **地图服务**：高德地图
- **LLM**：阿里云百炼（可切换其他提供商）

## 目录结构

```
src/
├── app/                    # 应用路由与页面
│   ├── api/               # API 路由
│   │   └── generate-itinerary/  # 行程生成 API
│   ├── new/               # 新建行程页面
│   ├── trips/             # 行程相关页面
│   │   ├── [id]/          # 行程详情页面
│   │   └── page.tsx       # 行程列表页面
│   └── page.tsx           # 首页
├── components/             # 通用组件
│   ├── AmapView.tsx       # 高德地图组件
│   └── AppHeader.tsx      # 应用头部
└── lib/                   # 工具库和服务封装
    ├── amap/              # 高德地图相关
    │   └── geocoding.ts   # 地理编码服务
    ├── llm/               # LLM 相关
    │   ├── client.ts      # LLM 客户端
    │   ├── price-query.ts # 价格查询
    │   └── prompts.ts     # 提示词构建
    ├── search/            # 搜索服务
    │   └── attraction-prices.ts  # 景点价格搜索
    └── supabase/          # Supabase 客户端
        └── client.ts
```

## 数据库迁移

所有数据库迁移文件位于 `supabase/migrations/` 目录：

1. `001_initial_schema.sql` - 初始表结构（trips, day_plans, plan_items, expenses）
2. `002_add_origin_destination.sql` - 添加起点和终点字段
3. `003_add_people_field.sql` - 添加人数字段

**执行顺序很重要**，请按顺序执行。

## 开发说明

### 环境变量

- 所有客户端环境变量必须以 `NEXT_PUBLIC_` 开头
- 服务器端环境变量（如 `LLM_API_KEY`）不要使用 `NEXT_PUBLIC_` 前缀
- 不要将任何密钥提交到仓库

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 Next.js App Router 规范
- 使用 Ant Design 组件库

## 常见问题

### Q: 为什么地图上不显示外国城市的地点？

A: 高德地图主要支持中国境内地址的地理编码。外国城市的地点无法进行地理编码，因此无法在地图上显示。系统会自动检测并提示您。

### Q: 为什么行程天数限制为 10 天？

A: 为了确保 AI 能够生成完整详细的行程计划，系统限制单次行程不超过 10 天。如果您的行程超过 10 天，建议拆分为多个行程分别规划。

### Q: 价格估算准确吗？

A: 所有费用均为估算价格，实际价格可能因时间、季节、预订渠道等因素而有所不同。特别是航班和酒店价格波动较大，建议在实际预订前查询实时价格。

### Q: 如何获取 API Key？

A: 请参考各服务商的官方文档：
- Supabase: `supabase/README.md`
- 高德地图: https://lbs.amap.com/
- 阿里云百炼: https://bailian.console.aliyun.com/

## Docker 部署

项目支持 Docker 容器化部署，详细说明请参考 [Docker 部署指南](./DOCKER.md)。

### 获取 Docker 镜像

#### 方式 1: 从镜像仓库拉取（如果已推送）

如果镜像已推送到镜像仓库，可以直接拉取：

```bash
# 从阿里云容器镜像服务拉取（示例）
docker pull registry.cn-hangzhou.aliyuncs.com/你的命名空间/vc-travel-agent:latest

# 或从 Docker Hub 拉取（示例）
docker pull 你的用户名/vc-travel-agent:latest
```

**注意**：目前镜像尚未推送到公共仓库，需要先构建。

#### 方式 2: 使用导出的镜像文件（推荐，快速开始）

如果提供了预构建的镜像文件，可以从 GitHub Releases 下载：

1. **下载镜像文件**
   - 访问 [GitHub Releases](https://github.com/SubterraneanRose/VC_TravelAgent/releases)
   - 下载 `vc-travel-agent-latest.tar` 文件

2. **加载镜像**
   ```bash
   # 加载镜像（无需解压，直接使用 .tar 文件）
   docker load -i vc-travel-agent-latest.tar
   
   # 验证镜像已加载
   docker images | grep vc-travel-agent
   ```

3. **运行容器**
   ```bash
   # 确保已配置 .env.local 文件（参考"快速开始"部分）
   docker run -d -p 3000:3000 --env-file .env.local vc-travel-agent:latest
   ```

**注意**：镜像文件大小约 48MB，请确保有足够的磁盘空间。

#### 方式 3: 本地构建镜像（推荐）

```bash
# 使用构建脚本（推荐）
# Linux/Mac:
chmod +x build-docker.sh && ./build-docker.sh

# Windows:
build-docker.bat

# 或直接使用 Docker 命令
docker build -t vc-travel-agent:latest .
```

### 运行容器

构建完成后，运行容器：

```bash
# 方式 1: 使用 docker run
docker run -d \
  --name vc-travel-agent \
  -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase anon key \
  -e LLM_API_KEY=你的LLM API Key \
  -e NEXT_PUBLIC_AMAP_API_KEY=你的高德地图API Key \
  vc-travel-agent:latest
```

```bash
# 方式 2: 使用 docker-compose（推荐）
# 1. 配置环境变量
cp env.example .env
# 编辑 .env 文件，填写所有必需的环境变量

# 2. 启动服务
docker-compose up -d

# 3. 查看日志
docker-compose logs -f
```

## 相关文档

- [产品需求文档](./PRD.md)
- [Supabase 设置说明](./supabase/README.md)
- [Docker 部署指南](./DOCKER.md)
- [景点价格查询机制](./docs/ATTRACTION_PRICE_QUERY.md)
- [价格 API 集成计划](./docs/PRICE_API_INTEGRATION.md)
- [LLM Web 搜索分析](./docs/LLM_WEB_SEARCH_ANALYSIS.md)

## 注意事项

- ⚠️ **不要将任何密钥提交到仓库**
- ⚠️ **生产环境必须配置基于用户身份的 RLS 策略**
- ⚠️ **高德地图不支持外国城市的地理编码**
- ⚠️ **行程天数限制为 10 天，超过请拆分规划**
