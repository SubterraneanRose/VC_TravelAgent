# 多阶段构建 Dockerfile for Next.js
# 阶段 1: 安装依赖
FROM node:18-alpine AS deps
WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json* ./

# 安装依赖（使用 npm ci 确保一致性）
RUN npm ci --only=production --ignore-scripts || npm install --only=production --ignore-scripts

# 阶段 2: 构建应用
FROM node:18-alpine AS builder
WORKDIR /app

# 复制依赖文件
COPY package.json package-lock.json* ./

# 安装所有依赖（包括 devDependencies，构建时需要）
RUN npm ci || npm install

# 复制源代码
COPY . .

# 确保 public 目录存在（如果不存在则创建空目录）
RUN mkdir -p public

# 构建 Next.js 应用
# 注意：NEXT_PUBLIC_ 环境变量需要在构建时提供（会被内联到客户端代码）
# 如果构建时没有这些变量，需要在运行时通过其他方式提供（如 API 路由）
# 这里使用 ARG 允许在构建时传递，但不会在最终镜像中保留
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_AMAP_API_KEY
ARG NEXT_PUBLIC_AMAP_WEB_SERVICE_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_AMAP_API_KEY=$NEXT_PUBLIC_AMAP_API_KEY
ENV NEXT_PUBLIC_AMAP_WEB_SERVICE_KEY=$NEXT_PUBLIC_AMAP_WEB_SERVICE_KEY

RUN npm run build

# 阶段 3: 运行应用
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物和必要文件
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# 复制 public 目录（在 builder 阶段已确保存在）
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 切换到非 root 用户
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]




