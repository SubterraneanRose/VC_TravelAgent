# VC_TravelAgent

基于 Next.js + TypeScript + Ant Design 的 Web 版 AI 旅行规划师。

## 快速开始（本地）
1. 安装依赖：`npm install`
2. 复制环境变量模板：
   - 若存在 `.env.example`：`cp .env.example .env.local`
   - 如不存在请使用 `env.example`：`cp env.example .env.local`
   并填写必要的 Key（不要提交到仓库）
3. 启动开发：`npm run dev`
4. 在浏览器访问并体验（默认 http://localhost:3000）

## Docker 运行
1. 构建镜像：`docker build -t vc-travel-agent .`
2. 运行容器：`docker run -p 3000:3000 --env-file .env.local vc-travel-agent`

## 技术栈
- Next.js 14（App Router）
- TypeScript
- Ant Design 5

## 目录结构（计划）
- `src/app`：应用路由与页面
- `src/components`：通用组件
- `src/lib`：API/LLM/服务封装

## 注意
- 不要将任何密钥提交到仓库。密钥通过 `.env.local` 或设置页输入。
