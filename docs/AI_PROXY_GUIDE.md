# 🤖 AI 代理服务完整指南

本指南详细介绍如何使用 NekroEdge 模板构建的 AI 代理服务平台，该平台允许 Claude Code 等工具通过统一接口调用各种 OpenAI 兼容的 LLM 服务。

## 📋 目录

- [核心功能](#核心功能)
- [快速开始](#快速开始)
- [环境配置](#环境配置)
- [用户管理](#用户管理)
- [API 提供商配置](#api-提供商配置)
- [模型映射规则](#模型映射规则)
- [Claude Code 集成](#claude-code-集成)
- [API 文档](#api-文档)
- [故障排除](#故障排除)

## 🌟 核心功能

### ✨ 主要特性

- **🔄 协议转换**: 将 Claude API 请求完美转换为 OpenAI API 格式
- **🎯 智能路由**: 基于模型名称关键词的自动路由规则
- **⚡ 流式支持**: 完整支持 Server-Sent Events (SSE) 流式响应
- **🛠️ 工具调用**: 完整支持 Function Calling / Tool Use
- **🔐 安全认证**: GitHub OAuth + API 密钥双重认证
- **🎨 用户友好**: 直观的 Web 管理界面
- **🚀 高性能**: 基于 Cloudflare Workers 的无服务器架构

### 🎯 支持的服务

- ✅ OpenAI 官方 API
- ✅ Azure OpenAI Service
- ✅ Ollama 本地模型
- ✅ OneAPI 聚合服务
- ✅ 其他 OpenAI 兼容的 API 服务

## 🚀 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone https://github.com/your-org/claude-code-nexus.git
cd claude-code-nexus

# 安装依赖
pnpm install

# 数据库迁移
pnpm db:migrate
```

### 2. 环境变量配置

创建必要的环境变量配置：

```bash
# 设置 GitHub OAuth（开发环境可跳过）
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put ENCRYPTION_KEY

# 或者在 wrangler.jsonc 中配置非敏感变量
```

### 3. 启动开发服务器

```bash
# 启动开发环境
pnpm dev

# 访问应用
# - 前端界面: http://localhost:5173
# - 完整应用: http://localhost:8787
# - API 文档: http://localhost:8787/api/doc
```

## ⚙️ 环境配置

### GitHub OAuth 设置

1. 访问 [GitHub Developer Settings](https://github.com/settings/applications/new)
2. 创建新的 OAuth App：
   - **Application name**: Claude AI Proxy
   - **Homepage URL**: `http://localhost:8787` (开发) / `https://your-domain.pages.dev` (生产)
   - **Authorization callback URL**: `http://localhost:8787/api/auth/github/callback`

3. 获取 Client ID 和 Client Secret，配置到环境变量

### 加密密钥生成

```bash
# 生成 32 字符的加密密钥
openssl rand -hex 16

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### Cloudflare 部署配置

```jsonc
// wrangler.jsonc
{
  "vars": {
    "APP_BASE_URL": "https://your-domain.pages.dev",
    "GITHUB_CLIENT_ID": "your_client_id",
  },
}
```

```bash
# 设置敏感信息为 Secrets
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put ENCRYPTION_KEY
```

## 👤 用户管理

### 用户注册/登录流程

1. **访问登录页面**: 点击 "使用 GitHub 登录"
2. **GitHub 授权**: 授权应用访问基本信息
3. **自动注册**: 首次登录自动创建账户
4. **获取 API 密钥**: 登录后获得专属的 `ANTHROPIC_API_KEY`

### 用户专属信息

每个用户获得：

- 🔑 **专属 API 密钥**: 格式为 `ak-xxxxxxxxxx`
- 🌐 **专属端点**: `https://your-domain.pages.dev/v1/messages`
- ⚙️ **独立配置空间**: API 提供商和模型映射规则

## 🔧 API 提供商配置

### 添加新提供商

1. 登录管理界面
2. 进入 "设置" → "API 提供商"
3. 点击 "添加新提供商"
4. 填写配置信息：

```json
{
  "name": "我的 OneAPI 服务",
  "baseUrl": "https://api.oneapi.com",
  "apiKey": "sk-xxxxxxxxxx",
  "isDefault": false
}
```

### 支持的提供商示例

#### OpenAI 官方

```json
{
  "name": "OpenAI 官方",
  "baseUrl": "https://api.openai.com",
  "apiKey": "sk-xxxxxxxxxx"
}
```

#### Azure OpenAI

```json
{
  "name": "Azure GPT-4o",
  "baseUrl": "https://your-resource.openai.azure.com",
  "apiKey": "your-azure-api-key"
}
```

#### Ollama 本地

```json
{
  "name": "本地 Ollama",
  "baseUrl": "http://localhost:11434",
  "apiKey": "dummy-key"
}
```

## 📊 模型映射规则

### 规则配置

模型映射规则定义了如何将 Claude 模型名称路由到特定的 API 提供商：

| 匹配关键词 | API 提供商   | 目标模型      | 优先级 |
| ---------- | ------------ | ------------- | ------ |
| `haiku`    | OneAPI 服务  | `gpt-4o-mini` | 1      |
| `sonnet`   | Azure GPT-4o | `gpt-4o`      | 2      |
| `opus`     | OpenAI 官方  | `gpt-4o`      | 3      |

### 工作原理

1. **接收请求**: 用户发送 Claude API 请求，模型为 `claude-3-5-sonnet-20240620`
2. **关键词匹配**: 系统检查模型名称包含 `sonnet`
3. **路由选择**: 根据规则路由到 "Azure GPT-4o" 提供商
4. **模型转换**: 将目标模型设置为 `gpt-4o`
5. **请求转发**: 发送到 Azure OpenAI 服务

### 规则管理

- ✅ **拖拽排序**: 支持优先级调整
- ✅ **启用/禁用**: 灵活控制规则状态
- ✅ **实时生效**: 配置立即生效，无需重启

## 🔌 Claude Code 集成

### 配置步骤

1. **获取认证信息**（登录后在仪表盘查看）：

   ```bash
   ANTHROPIC_BASE_URL=https://your-domain.pages.dev/api/claude
   ANTHROPIC_API_KEY=ak-xxxxxxxxxx
   ```

2. **配置 Claude Code CLI**：

   ```bash
   # 方法一：使用 claude config 命令（推荐）
   claude config set \
     --api-key="ak-xxxxxxxxxx" \
     --base-url="https://your-domain.pages.dev/api/claude"

   # 方法二：设置环境变量
   export ANTHROPIC_BASE_URL="https://your-domain.pages.dev/api/claude"
   export ANTHROPIC_API_KEY="ak-xxxxxxxxxx"

   # 方法三：创建 .env 文件
   echo "ANTHROPIC_BASE_URL=https://your-domain.pages.dev/api/claude" >> .env
   echo "ANTHROPIC_API_KEY=ak-xxxxxxxxxx" >> .env
   ```

3. **验证配置**：
   ```bash
   claude --version
   claude "Hello, test the connection"
   ```

### 使用示例

```bash
# 使用 haiku 模型（将路由到 gpt-4o-mini）
claude --model claude-3-haiku-20240307 "简单的问题"

# 使用 sonnet 模型（将路由到 Azure gpt-4o）
claude --model claude-3-5-sonnet-20240620 "复杂的问题"

# 流式输出测试
claude --stream "请写一个 Python 脚本"

# 工具使用测试
claude "请帮我分析这个文件的内容" --attach file.txt
```

## 📚 API 文档

### 核心端点

#### Claude Messages API

```http
POST /v1/messages
Content-Type: application/json
X-API-Key: ak-xxxxxxxxxx

{
  "model": "claude-3-5-sonnet-20240620",
  "max_tokens": 4096,
  "messages": [
    {
      "role": "user",
      "content": "Hello!"
    }
  ],
  "stream": true
}
```

#### 用户认证 API

```http
GET /api/auth/github
GET /api/auth/github/callback?code=xxx
GET /api/auth/me
POST /api/auth/logout
```

#### 配置管理 API

```http
GET /api/config/providers
POST /api/config/providers
PUT /api/config/providers/{id}
DELETE /api/config/providers/{id}

GET /api/config/mappings
POST /api/config/mappings
PUT /api/config/mappings/{id}
DELETE /api/config/mappings/{id}
```

### 完整 API 文档

访问 `http://localhost:8787/api/doc` 查看 Swagger UI 文档。

## 🔍 故障排除

### 常见问题

#### 1. 认证失败

```bash
# 错误信息
{"error": {"type": "authentication_error", "message": "Invalid API key"}}

# 解决方案
- 检查 API 密钥是否正确
- 确认环境变量设置正确
- 验证用户是否已登录并获取密钥
```

#### 2. 模型路由失败

```bash
# 错误信息
{"error": {"type": "invalid_request_error", "message": "No API provider configured"}}

# 解决方案
- 添加至少一个 API 提供商
- 设置默认提供商
- 检查模型映射规则
```

#### 3. 流式响应问题

```bash
# 症状：Claude Code 无法显示实时输出

# 解决方案
- 检查上游 API 是否支持流式响应
- 验证 Content-Type: text/event-stream
- 确认 SSE 事件格式正确
```

#### 4. 工具调用失败

```bash
# 症状：Function Calling 不工作

# 解决方案
- 确认目标 API 支持工具调用
- 检查工具定义格式转换
- 验证参数 JSON 序列化
```

### 调试技巧

#### 1. 启用详细日志

```bash
# 开发环境查看 Wrangler 日志
pnpm dev:backend

# 查看请求/响应详情
```

#### 2. 测试 API 连通性

```bash
# 直接测试 Claude API
curl -X POST "http://localhost:8787/v1/messages" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ak-xxxxxxxxxx" \
  -d '{
    "model": "claude-3-haiku-20240307",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

#### 3. 验证环境配置

```bash
# 检查数据库连接
pnpm db:studio

# 验证环境变量
wrangler whoami
```

### 性能优化

#### 1. 缓存策略

- API 响应缓存（适用于稳定内容）
- 模型映射规则缓存
- 用户认证信息缓存

#### 2. 监控指标

- 请求响应时间
- API 调用成功率
- 流式传输延迟
- 错误率统计

## 🚀 部署到生产环境

### 1. 环境准备

```bash
# 构建项目
pnpm build

# 数据库迁移（生产环境）
pnpm db:migrate:prod
```

### 2. 配置 Secrets

```bash
wrangler secret put GITHUB_CLIENT_SECRET --env production
wrangler secret put ENCRYPTION_KEY --env production
```

### 3. 部署

```bash
pnpm deploy
```

### 4. 验证部署

```bash
# 健康检查
curl https://your-domain.pages.dev/api/doc

# 功能验证
curl -X POST "https://your-domain.pages.dev/v1/messages" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ak-xxxxxxxxxx" \
  -d '{"model": "claude-3-haiku-20240307", "max_tokens": 10, "messages": [{"role": "user", "content": "Hi"}]}'
```

## 🤝 贡献指南

欢迎贡献代码！请参考：

- [开发指南](./DEVELOPMENT.md)
- [API 指南](./API_GUIDE.md)
- [架构文档](./ARCHITECTURE.md)

## 📄 许可证

本项目基于 MIT 许可证开源。详见 [LICENSE](../LICENSE) 文件。
