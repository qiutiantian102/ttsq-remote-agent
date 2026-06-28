#!/usr/bin/env node
/**
 * TTSQ 远程控制 - 被控端 Agent
 * 功能：注册控制码、上报 tunnel URL、维持心跳
 *
 * 使用方式：
 *   node agent.js --code ABC123 --server https://ttsq-api.qiutiantian102.workers.dev --tunnel-url wss://xxx.trycloudflare.com
 *
 * 或创建 config.json 后直接运行：
 *   node agent.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ============ 配置 ============
const CONFIG_PATH = path.join(__dirname, 'config.json');
const HEARTBEAT_INTERVAL = 60000; // 60秒心跳

// 读取配置（优先级：命令行 > config.json > 环境变量）
function loadConfig() {
  const args = process.argv.slice(2);
  const config = {};

  // 解析命令行参数
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--code' && args[i + 1]) config.code = args[++i];
    else if (args[i] === '--server' && args[i + 1]) config.server = args[++i];
    else if (args[i] === '--tunnel-url' && args[i + 1]) config.tunnelUrl = args[++i];
    else if (args[i] === '--password-hint' && args[i + 1]) config.passwordHint = args[++i];
    else if (args[i] === '--help' || args[i] === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  // 从 config.json 补充
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const fileConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      for (const key of ['code', 'server', 'tunnelUrl', 'passwordHint']) {
        if (!config[key] && fileConfig[key]) config[key] = fileConfig[key];
      }
    } catch (e) {
      console.error('[Agent] 读取 config.json 失败：', e.message);
    }
  }

  // 环境变量兜底
  if (!config.code) config.code = process.env.TTSQ_REMOTE_CODE;
  if (!config.server) config.server = process.env.TTSQ_SERVER || 'https://ttsq-api.qiutiantian102.workers.dev';
  if (!config.tunnelUrl) config.tunnelUrl = process.env.TTSQ_TUNNEL_URL;

  return config;
}

function printHelp() {
  console.log(`
TTSQ 远程控制 - 被控端 Agent

使用方式：
  node agent.js --code <控制码> --tunnel-url <WebSocket URL>

参数：
  --code           控制码（6-8位字母数字，用户自己设定）
  --server         TTSQ API 服务器地址（默认：生产服务器）
  --tunnel-url    cloudflared tunnel 的 wss:// 地址
  --password-hint VNC 密码提示（可选，不要填真实密码！）

示例：
  node agent.js --code ABC123 --tunnel-url wss://abc.trycloudflare.com

也可创建 config.json 文件，运行时自动读取。
`);
}

// ============ HTTP 请求封装 ============
function apiRequest(server, path, method, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, server);
    const lib = url.protocol === 'https:' ? https : http;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(json.error || `HTTP ${res.statusCode}`));
          }
        } catch {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ============ 注册 ============
async function register(config) {
  console.log(`[Agent] 注册控制码 ${config.code} → ${config.tunnelUrl}`);
  const result = await apiRequest(config.server, '/api/remote/register', 'POST', {
    code: config.code,
    tunnelUrl: config.tunnelUrl,
    passwordHint: config.passwordHint || '',
  });
  console.log('[Agent] 注册成功：', result.message || '');
  return result;
}

// ============ 心跳 ============
async function sendHeartbeat(config) {
  try {
    await apiRequest(config.server, `/api/remote/heartbeat/${config.code}`, 'PUT', {});
    console.log(`[Agent] 心跳正常 [${new Date().toLocaleTimeString()}]`);
  } catch (e) {
    console.error('[Agent] 心跳失败：', e.message);
  }
}

// ============ 注销 ============
async function deregister(config) {
  try {
    await apiRequest(config.server, `/api/remote/${config.code}`, 'DELETE', {});
    console.log('[Agent] 已注销控制码');
  } catch (e) {
    console.error('[Agent] 注销失败（可忽略）：', e.message);
  }
}

// ============ 主流程 ============
async function main() {
  const config = loadConfig();

  // 验证必填参数
  if (!config.code) {
    console.error('❌ 缺少控制码！请通过 --code 参数或 config.json 指定。');
    printHelp();
    process.exit(1);
  }
  if (!config.tunnelUrl) {
    console.error('❌ 缺少 tunnel URL！请通过 --tunnel-url 参数或 config.json 指定。');
    console.error('   提示：先运行 cloudflared tunnel --url localhost:6080 获取 URL');
    process.exit(1);
  }
  if (!config.tunnelUrl.startsWith('ws://') && !config.tunnelUrl.startsWith('wss://')) {
    console.error('❌ tunnel-url 必须以 ws:// 或 wss:// 开头');
    process.exit(1);
  }

  console.log(`[Agent] TTSQ 远程控制 Agent 启动`);
  console.log(`[Agent] 服务器：${config.server}`);
  console.log(`[Agent] 控制码：${config.code}`);
  console.log(`[Agent] Tunnel：${config.tunnelUrl}`);
  console.log('---');

  // 注册
  try {
    await register(config);
  } catch (e) {
    console.error('❌ 注册失败：', e.message);
    console.error('请检查服务器地址和控制码是否正确，或控制码是否已被占用。');
    process.exit(1);
  }

  // 启动心跳
  const heartbeatTimer = setInterval(() => {
    sendHeartbeat(config);
  }, HEARTBEAT_INTERVAL);

  // 优雅退出
  const shutdown = async (signal) => {
    console.log(`\n[Agent] 收到 ${signal}，正在退出...`);
    clearInterval(heartbeatTimer);
    await deregister(config);
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  console.log('[Agent] 运行中，按 Ctrl+C 退出');
}

main().catch((e) => {
  console.error('[Agent] 致命错误：', e.message);
  process.exit(1);
});
