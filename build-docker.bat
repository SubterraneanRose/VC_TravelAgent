@echo off
REM Docker 构建脚本 (Windows)
REM 用于快速构建 VC_TravelAgent Docker 镜像

set IMAGE_NAME=vc-travel-agent
set IMAGE_TAG=%1
if "%IMAGE_TAG%"=="" set IMAGE_TAG=latest

echo 🚀 开始构建 Docker 镜像: %IMAGE_NAME%:%IMAGE_TAG%

REM 构建镜像
docker build -t %IMAGE_NAME%:%IMAGE_TAG% .

if %ERRORLEVEL% EQU 0 (
    echo ✅ 镜像构建完成: %IMAGE_NAME%:%IMAGE_TAG%
    echo.
    echo 📦 镜像信息:
    docker images %IMAGE_NAME%:%IMAGE_TAG%
    echo.
    echo 💡 运行镜像:
    echo    docker run -d -p 3000:3000 --name vc-travel-agent %IMAGE_NAME%:%IMAGE_TAG%
    echo.
    echo 💡 或使用 docker-compose:
    echo    docker-compose up -d
) else (
    echo ❌ 镜像构建失败
    exit /b 1
)

