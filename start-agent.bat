@echo off
REM TTSQ 远程控制 Agent - Windows 启动脚本
REM 使用前请先完成安装步骤（见 README.md）

cd /d "%~dp0"

echo ===============================
echo  TTSQ 远程控制 - 被控端 Agent
echo ===============================
echo.

REM 检查 Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未找到 Node.js，请先安装 Node.js 16+
  pause
  exit /b 1
)

REM 检查 config.json
if not exist "config.json" (
  echo [警告] 未找到 config.json，将使用默认配置
  echo 请复制 config.example.json 为 config.json 并填写你的配置
  echo.
  pause
)

echo [Agent] 启动中...
echo 按 Ctrl+C 停止
echo.
node agent.js
pause
