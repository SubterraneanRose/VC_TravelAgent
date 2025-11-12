#!/bin/bash

# Docker 构建脚本
# 用于快速构建 VC_TravelAgent Docker 镜像

set -e

IMAGE_NAME="vc-travel-agent"
IMAGE_TAG="${1:-latest}"

echo "🚀 开始构建 Docker 镜像: ${IMAGE_NAME}:${IMAGE_TAG}"

# 检查是否有 .env.local 文件，如果有则读取 NEXT_PUBLIC_ 变量用于构建
BUILD_ARGS=""
if [ -f .env.local ]; then
    echo "📝 从 .env.local 读取 NEXT_PUBLIC_ 环境变量用于构建..."
    while IFS='=' read -r key value || [ -n "$key" ]; do
        # 跳过空行和注释
        if [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]]; then
            continue
        fi
        
        # 只处理 NEXT_PUBLIC_ 开头的变量（需要在构建时提供）
        if [[ "$key" =~ ^[[:space:]]*NEXT_PUBLIC_ ]]; then
            key=$(echo "$key" | xargs)
            value=$(echo "$value" | xargs | sed "s/^['\"]//; s/['\"]$//")
            if [ -n "$value" ]; then
                BUILD_ARGS="$BUILD_ARGS --build-arg $key=$value"
            fi
        fi
    done < .env.local
    
    if [ -n "$BUILD_ARGS" ]; then
        echo "✅ 找到 NEXT_PUBLIC_ 环境变量，将在构建时传递"
    else
        echo "⚠️  未找到 NEXT_PUBLIC_ 环境变量，构建时客户端代码可能使用空值"
        echo "💡 提示: 如果构建时没有这些变量，需要在运行时通过环境变量提供"
    fi
else
    echo "⚠️  .env.local 文件不存在，构建时客户端代码可能使用空值"
    echo "💡 提示: 建议创建 .env.local 文件并配置 NEXT_PUBLIC_ 变量"
fi

# 构建镜像（传递 NEXT_PUBLIC_ 环境变量）
docker build $BUILD_ARGS -t ${IMAGE_NAME}:${IMAGE_TAG} .

echo "✅ 镜像构建完成: ${IMAGE_NAME}:${IMAGE_TAG}"

# 显示镜像信息
echo ""
echo "📦 镜像信息:"
docker images ${IMAGE_NAME}:${IMAGE_TAG}

echo ""
echo "💡 运行镜像:"
echo "   docker run -d -p 3000:3000 --name vc-travel-agent ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo "💡 或使用 docker-compose:"
echo "   docker-compose up -d"

