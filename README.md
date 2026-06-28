# TTSQ 远程控制 - 被控端 Agent

开源被控端程序，让任何人都能把自己的电脑接入 TTSQ 远程控制。

## 原理

```
主控端（TTSQ 网站）           TTSQ 服务器             被控端
    输入控制码  →  查询 code→URL  →   —
        ↓                    ↓               ↑
   noVNC 连接  →  —                    |
        ↓                    ↓               |
        └─────────→  wss://tunnel  ←───  cloudflared
                            ↓
                      TightVNC (5900)
                            ↓
                       websockify (6080)
```

1. 被控端运行 Agent，向服务器注册「控制码 → Tunnel URL」
2. 主控端在 TTSQ 网站输入控制码（和 VNC 密码）
3. 前端从服务器查询到 Tunnel URL，noVNC 直接连接
4. 连接经过 Cloudflare Tunnel，穿透 NAT，无需公网 IP

## 安装步骤

### 1. 安装依赖

| 软件 | 用途 | 下载 |
|---|---|---|
| Node.js 16+ | 运行 Agent | https://nodejs.org/ |
| TightVNC | VNC 服务器 | https://www.tightvnc.com/ |
| Python 3 | 运行 websockify | https://python.org/ |
| Cloudflared | Cloudflare Tunnel | https://github.com/cloudflare/cloudflared/releases |

### 2. 安装 websockify

```bash
pip install websockify
```

### 3. 配置 TightVNC

- 设置 VNC 密码（记住它，主控端连接时需要）
- 勾选「Allow loopback connections」（Access Control 标签页）
- 启动 TightVNC Server

### 4. 启动 websockify

```bash
websockify 6080 localhost:5900
```

### 5. 启动 Cloudflare Tunnel

```bash
cloudflared tunnel --url localhost:6080
```

启动后会显示类似这样的 URL：

```
Your quick Tunnel is available at: wss://abc-def.trycloudflare.com
```

复制这个 `wss://` 开头的地址。

### 6. 配置 Agent

复制 `config.example.json` 为 `config.json`：

```json
{
  "code": "ABC123",
  "server": "https://ttsq-api.qiutiantian102.workers.dev",
  "tunnelUrl": "wss://abc-def.trycloudflare.com",
  "passwordHint": "6位密码"
}
```

- `code`：你自己设定的控制码（6-8位字母数字，告诉要连你的人）
- `tunnelUrl`：上一步得到的 wss:// 地址
- `passwordHint`：密码提示（**不要填真实密码**）

### 7. 启动 Agent

```bash
node agent.js
```

或 Windows 双击 `start-agent.bat`。

看到「注册成功」即可。

## 使用方式

1. 把你的**控制码**告诉要远程控制你的人
2. 对方在 TTSQ 网站 → 远程控制 → 输入控制码 + VNC 密码
3. 连接成功！

## 开源

本被控端程序开源，任何人都可以：
- 查看源代码
- 自行部署 TTSQ 服务器
- 修改 Agent 适配自己的服务器

## 安全提示

- **控制码**相当于门钥匙，只告诉信任的人
- **VNC 密码**不要在 `passwordHint` 里填真实密码
- 不用时关闭 Agent 和 Tunnel 即可下线
- 建议设置 TightVNC 的「Access Control」限制来源 IP

## 故障排查

| 问题 | 解决办法 |
|---|---|
| Agent 注册失败 | 检查服务器地址是否正确，控制码是否被占用 |
| 主控端连接失败 | 确认 websockify 和 cloudflared 都在运行 |
| 连接后黑屏 | 检查 TightVNC 是否勾选了「Allow loopback」 |
| Tunnel URL 变了 | cloudflared 每次启动 URL 不同，需要更新 config.json 并重启 Agent |
