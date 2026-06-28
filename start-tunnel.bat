@echo off
REM 启动 cloudflared tunnel（需要先运行 websockify）
REM 使用方法：start-tunnel.bat [端口]
REM 默认端口：6080（websockify）

cd /d "%~dp0"

set PORT=6080
if not "%~1"=="" set PORT=%~1

echo [Tunnel] 启动 cloudflared tunnel，转发端口 %PORT%...
echo 首次运行需要登录 Cloudflare 账号
echo Tunnel URL 会在启动后显示，复制它填入 config.json 的 tunnelUrl
echo.
echo 按 Ctrl+C 停止
echo.

cloudflared tunnel --url localhost:%PORT%
pause
