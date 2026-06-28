@echo off
REM TTSQ 远程控制 Agent - 安装脚本
echo ===============================
echo  TTSQ 远程控制 - 被控端安装
echo ===============================
echo.

REM 检查 Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未找到 Node.js
  echo 请先安装 Node.js：https://nodejs.org/
  pause
  exit /b 1
)
echo [√] Node.js 已安装：
node --version

REM 检查 Python（websockify 需要）
where python >nul 2>nul
if errorlevel 1 (
  echo [警告] 未找到 Python，websockify 将无法运行
  echo 请安装 Python：https://python.org/
) else (
  echo [√] Python 已安装
)

REM 检查 cloudflared
where cloudflared >nul 2>nul
if errorlevel 1 (
  echo [警告] 未找到 cloudflared
  echo 请安装：https://github.com/cloudflare/cloudflared/releases
) else (
  echo [√] cloudflared 已安装
)

echo.
echo ========== 配置步骤 ==========
echo 1. 复制 config.example.json 为 config.json
echo 2. 编辑 config.json，填写你的控制码和 tunnel URL
echo 3. 先运行 start-tunnel.bat 启动隧道
echo 4. 再运行 start-agent.bat 启动 Agent
echo.
echo 详见 README.md
echo.
pause
