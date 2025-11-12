# Docker 部署指南

本文档说明如何使用 Docker 构建和运行 VC_TravelAgent 应用。

## 前置要求

- Docker 20.10+
- Docker Compose 2.0+（可选，用于 docker-compose）

## 快速开始

### 1. 构建 Docker 镜像

```bash
docker build -t vc-travel-agent:latest .
```

### 2. 运行容器

#### 方式 1: 使用 docker run

```bash
docker run -d \
  --name vc-travel-agent \
  -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase anon key \
  -e LLM_API_KEY=你的LLM API Key \
  -e NEXT_PUBLIC_AMAP_API_KEY=你的高德地图API Key \
  vc-travel-agent:latest
```

#### 方式 2: 使用 docker-compose（推荐）

1. 创建 `.env` 文件（或使用 `.env.local`）：

```bash
cp env.example .env
```

2. 编辑 `.env` 文件，填写所有必需的环境变量

3. 启动服务：

```bash
docker-compose up -d
```

4. 查看日志：

```bash
docker-compose logs -f
```

5. 停止服务：

```bash
docker-compose down
```

## 环境变量

所有环境变量都需要在运行容器时提供。必需的环境变量包括：

### 必需配置

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key
- `LLM_API_KEY`: LLM API Key（用于行程生成）

### 可选配置

- `NEXT_PUBLIC_AMAP_API_KEY`: 高德地图 JS API Key
- `NEXT_PUBLIC_AMAP_WEB_SERVICE_KEY`: 高德地图 Web 服务 Key
- `NEXT_PUBLIC_MAP_PROVIDER`: 地图提供商（默认: amap）
- `NEXT_PUBLIC_SPEECH_PROVIDER`: 语音识别提供商（默认: xfyun）

## 推送到镜像仓库

### 推送到 Docker Hub

```bash
# 登录 Docker Hub
docker login

# 标记镜像
docker tag vc-travel-agent:latest 你的用户名/vc-travel-agent:latest

# 推送镜像
docker push 你的用户名/vc-travel-agent:latest
```

### 推送到阿里云容器镜像服务

#### 1. 获取访问凭证

阿里云容器镜像服务需要使用**访问凭证（AccessKey）**进行认证，而不是账号密码。

**推荐方式：使用 RAM 用户 AccessKey（更安全）**

RAM（Resource Access Management）用户是阿里云提供的子账号功能，可以：
- ✅ 最小权限原则：只授予必要的容器镜像服务权限
- ✅ 降低风险：即使泄露也不会影响主账号
- ✅ 便于管理：可以随时撤销或修改权限

**创建 RAM 用户并获取 AccessKey：**

1. **创建 RAM 用户**
   - 访问 [RAM 控制台](https://ram.console.aliyun.com/users)
   - 点击"创建用户"
   - 选择"自定义创建" → "用户"
   - 填写用户名（如：`docker-push-user`）
   - 选择"编程访问"（生成 AccessKey）
   - 完成创建

2. **为 RAM 用户授权容器镜像服务权限**
   - 在 RAM 用户列表中，点击刚创建的用户
   - 进入"权限管理"标签页
   - 点击"添加权限"
   - 选择"系统策略" → 搜索并选择：
     - `AliyunContainerRegistryFullAccess`（容器镜像服务完全管理权限）
     - 或 `AliyunContainerRegistryPushAccess`（仅推送权限，更安全）
   - 点击"确定"完成授权

3. **创建 AccessKey**
   - 在 RAM 用户详情页，点击"安全信息"标签页
   - 在"AccessKey"区域，点击"创建 AccessKey"
   - 验证身份（手机验证码等）
   - 保存 AccessKey ID 和 AccessKey Secret
     - ⚠️ **重要**：AccessKey Secret 只显示一次，请立即保存

**备选方式：使用主账号 AccessKey（不推荐）**

如果必须使用主账号 AccessKey：
1. 登录 [阿里云控制台](https://home.console.aliyun.com/)
2. 鼠标悬停在右上角头像 → 选择"AccessKey 管理"
3. 创建 AccessKey（如果还没有）
   - AccessKey ID：作为用户名
   - AccessKey Secret：作为密码

**⚠️ 安全提示：**
- AccessKey 具有账户权限，请妥善保管
- 不要将 AccessKey 提交到代码仓库
- **强烈建议使用 RAM 用户 AccessKey 而不是主账号 AccessKey**

#### 2. 登录镜像仓库

**⚠️ 重要：使用 AccessKey ID，不是 RAM 用户名！**

```bash
# 方式 1：交互式登录（推荐）
docker login --username=你的AccessKeyID registry.cn-hangzhou.aliyuncs.com
# 提示输入密码时，输入 AccessKey Secret（不是 RAM 用户名）

# 方式 2：非交互式登录（适合脚本）
echo "你的AccessKeySecret" | docker login --username=你的AccessKeyID --password-stdin registry.cn-hangzhou.aliyuncs.com
```

**常见错误和排查：**

1. **❌ 使用 RAM 用户名而不是 AccessKey ID，或 AccessKey ID 格式错误**
   - 错误：`docker login --username=vc-travel-agent-administrator ...`（使用 RAM 用户名）
   - 错误：`docker login --username=u16GBq7xvwuuBMn2vWIK7bRjadGrW1 ...`（格式不对，可能是 Secret）
   - 正确：`docker login --username=LTAI5txxxxxxxxxxxxx ...`（使用 AccessKey ID，通常以 `LTAI5t` 开头）
   - 如何获取 AccessKey ID：RAM 用户 → 安全信息 → AccessKey 列表
   - ⚠️ **注意**：AccessKey ID 和 Secret 是不同的：
     - AccessKey ID：通常以 `LTAI5t` 开头，较短（约 20-30 字符）
     - AccessKey Secret：较长（约 30-40 字符），包含字母、数字和特殊字符

2. **❌ URL 拼写错误**
   - 错误：`registry.cn-hangzhou.aliyuncs.comom`（多了 `om`）
   - 正确：`registry.cn-hangzhou.aliyuncs.com`

3. **❌ AccessKey Secret 输入错误**
   - 确保复制完整的 Secret（通常很长，包含特殊字符）
   - 注意不要有多余的空格或换行

4. **❌ RAM 用户权限不足**
   - 检查 RAM 用户是否已授权容器镜像服务权限
   - 确认策略：`AliyunContainerRegistryFullAccess` 或 `AliyunContainerRegistryPushAccess`

**验证步骤：**

1. **确认 AccessKey ID 和 Secret**
   - 登录 [RAM 控制台](https://ram.console.aliyun.com/users)
   - 找到对应的 RAM 用户
   - 进入"安全信息" → "AccessKey"
   - 确认 AccessKey ID（格式：`LTAI5t...`）
   - ⚠️ **重要**：如果 Secret 丢失，需要删除旧 AccessKey 并创建新的
   - 确保复制 Secret 时没有多余的空格或换行

2. **验证权限配置（最关键）**
   - 在 RAM 用户详情页 → "权限管理"
   - 确认已添加以下策略之一：
     - `AliyunContainerRegistryFullAccess`（容器镜像服务完全管理权限）
     - `AliyunContainerRegistryPushAccess`（仅推送权限）
   - 如果没有权限，点击"添加权限" → 选择系统策略 → 搜索并添加上述策略
   - ⚠️ **权限生效可能需要几分钟**，添加后等待 2-3 分钟再重试

3. **确认容器镜像服务已开通**
   - 访问 [容器镜像服务控制台](https://cr.console.aliyun.com/)
   - 确认服务已开通（首次使用需要开通）
   - 确认已创建命名空间（如果没有，需要先创建）

4. **测试登录**
   ```bash
   # 使用正确的 AccessKey ID（不是用户名）
   docker login --username=LTAI5t你的AccessKeyID registry.cn-hangzhou.aliyuncs.com
   # 输入 AccessKey Secret（确保完全正确，没有多余字符）
   ```

**如果仍然失败，尝试以下方法：**

1. **使用非交互式登录测试 Secret 是否正确**
   ```bash
   echo "你的AccessKeySecret" | docker login --username=LTAI5t你的AccessKeyID --password-stdin registry.cn-hangzhou.aliyuncs.com
   ```

2. **检查 AccessKey 状态和网络限制**
   - 在 RAM 控制台确认 AccessKey 状态为"启用"
   - 如果被禁用，需要启用或创建新的
   - ⚠️ **重要**：检查是否启用了"AccessKey 级网络访问限制策略"
     - 如果已启用，确认你的当前 IP 在白名单中
     - 如果当前 IP 不在白名单，登录会失败
     - **建议**：如果是为了解决登录问题，暂时**不要启用**网络限制；如果已启用，需要添加当前 IP 到白名单

3. **验证权限是否生效**
   - 在 RAM 用户权限管理中，确认策略已正确添加
   - 可以尝试删除权限后重新添加，确保权限生效

4. **检查容器镜像服务区域**
   - 确认你使用的区域（如 `cn-hangzhou`）与你的容器镜像服务实例区域一致
   - 如果不一致，使用正确的区域地址

#### 3. 标记和推送镜像

```bash
# 标记镜像（替换为你的实际命名空间）
docker tag vc-travel-agent:latest registry.cn-hangzhou.aliyuncs.com/你的命名空间/vc-travel-agent:latest

# 推送镜像
docker push registry.cn-hangzhou.aliyuncs.com/你的命名空间/vc-travel-agent:latest
```

**获取命名空间：**
1. 访问 [阿里云容器镜像服务控制台](https://cr.console.aliyun.com/)
2. 在左侧菜单选择"命名空间"
3. 创建或查看已有的命名空间名称

## 备用方案：导出镜像为 .tar 文件

如果暂时无法登录阿里云或推送到镜像仓库，可以将镜像导出为 `.tar` 文件，便于离线分享和使用。

### 导出镜像

```bash
# 导出镜像为 .tar 文件
docker save vc-travel-agent:latest -o vc-travel-agent-latest.tar

# 可选：压缩以减小文件大小
gzip vc-travel-agent-latest.tar
# 生成文件：vc-travel-agent-latest.tar.gz
```

### 使用导出的镜像文件

**加载镜像：**
```bash
# 如果已压缩，先解压
gunzip vc-travel-agent-latest.tar.gz

# 加载镜像
docker load -i vc-travel-agent-latest.tar

# 验证镜像已加载
docker images | grep vc-travel-agent
```

**运行容器：**
```bash
# 使用加载的镜像运行容器
docker run -d -p 3000:3000 --env-file .env.local vc-travel-agent:latest
```

### 分享镜像文件

#### 方式 1: 上传到 GitHub Releases（推荐）

**操作步骤：**

1. **创建 Release**
   - 访问 GitHub 仓库页面
   - 点击右侧 "Releases" → "Create a new release"
   - 填写版本号（如：`v1.0.0`）
   - 填写 Release 标题和描述

2. **上传镜像文件**
   - 在 "Attach binaries" 区域，点击 "Choose your files"
   - 选择 `vc-travel-agent-latest.tar` 文件
   - 等待上传完成（文件大小约 48MB）

3. **发布 Release**
   - 点击 "Publish release" 按钮
   - 发布后，文件会自动生成下载链接

4. **获取下载链接**
   - Release 发布后，镜像文件的下载链接格式为：
     ```
     https://github.com/用户名/仓库名/releases/download/版本号/vc-travel-agent-latest.tar
     ```
   - 例如：`https://github.com/SubterraneanRose/VC_TravelAgent/releases/download/v1.0.0/vc-travel-agent-latest.tar`

5. **更新 README**
   - 在 README 中添加下载链接和使用说明（已更新）

**GitHub Releases 限制：**
- 单个文件大小限制：建议 < 2GB（你的文件约 48MB，符合要求）
- 适合公开项目
- 提供稳定的下载链接

#### 方式 2: 其他存储服务

- 阿里云 OSS、腾讯云 COS 等云存储
- 网盘服务（百度网盘、OneDrive 等）
- 自建文件服务器

### 文件大小说明

- 未压缩的 `.tar` 文件通常较大（几百MB到几GB）
- 使用 `gzip` 压缩可以显著减小文件大小（通常可减少 50-70%）
- 建议压缩后上传，减少下载时间

### 注意事项

- `.tar` 文件包含完整的镜像层，文件较大
- 确保有足够的磁盘空间存储和传输
- 如果上传到 GitHub Releases，注意文件大小限制（建议 < 2GB）

## 使用 GitHub Actions 自动构建

可以配置 GitHub Actions 自动构建 Docker 镜像并推送到镜像仓库。示例工作流文件：

```yaml
# .github/workflows/docker-build.yml
name: Build and Push Docker Image

on:
  push:
    branches: [ main, development ]
    tags: [ 'v*' ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Aliyun Container Registry
        uses: docker/login-action@v2
        with:
          registry: registry.cn-hangzhou.aliyuncs.com
          username: ${{ secrets.ALIYUN_USERNAME }}
          password: ${{ secrets.ALIYUN_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: registry.cn-hangzhou.aliyuncs.com/你的命名空间/vc-travel-agent:latest
```

## 健康检查

容器包含健康检查配置，可以通过以下命令查看：

```bash
docker ps
```

健康检查会每 30 秒执行一次，检查应用是否正常运行。

## 故障排查

### 查看容器日志

```bash
docker logs vc-travel-agent
# 或使用 docker-compose
docker-compose logs -f app
```

### 进入容器调试

```bash
docker exec -it vc-travel-agent sh
```

### 检查环境变量

```bash
docker exec vc-travel-agent env
```

## 生产环境建议

1. **使用环境变量文件**：不要将敏感信息硬编码在 docker-compose.yml 中
2. **使用 secrets**：在生产环境中使用 Docker secrets 或 Kubernetes secrets
3. **配置反向代理**：使用 Nginx 或 Traefik 作为反向代理
4. **启用 HTTPS**：配置 SSL 证书
5. **监控和日志**：配置日志收集和监控系统
6. **资源限制**：设置 CPU 和内存限制

## 镜像大小优化

当前 Dockerfile 使用多阶段构建，最终镜像大小约为 200-300MB。如需进一步优化：

1. 使用 `.dockerignore` 排除不必要的文件
2. 使用 Alpine Linux 基础镜像（已使用）
3. 启用 Next.js standalone 输出模式（已启用）

