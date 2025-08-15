# 📦 部署指南

本指南将详细介绍如何将 Claude Code Nexus AI 代理服务部署到 Cloudflare Pages & Workers 生产环境。

> 🤖 **特别说明**: 本项目是一个完整的 AI 代理服务，需要配置 GitHub OAuth、API 密钥加密等特殊环境变量。

## 🚀 部署前准备

### 1. 准备 Cloudflare 账户

- 注册 [Cloudflare 账户](https://dash.cloudflare.com/sign-up)
- 确保账户已验证邮箱
- 准备一个域名 (可选，Cloudflare 会提供子域名)

### 2. 环境变量准备

在部署前，您需要准备以下关键环境变量：

#### GitHub OAuth 应用配置

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 **"New OAuth App"**
3. 填写应用信息：
   - **Application name**: `Claude Code Nexus`（或您的应用名称）
   - **Homepage URL**: `https://your-domain.com`（您的实际域名）
   - **Authorization callback URL**: `https://your-domain.com/api/auth/github/callback`
4. 创建后记录 **Client ID** 和 **Client Secret**

#### 加密密钥生成

```bash
# 生成 256 位的加密密钥（用于 API 密钥加密）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. 准备代码仓库

```bash
# 确保代码已推送到 Git 仓库 (GitHub/GitLab)
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 4. 本地环境测试

在部署前，建议先在本地测试完整配置：

```bash
# 复制环境变量模板
cp env.example .env

# 编辑 .env 文件，填入实际值
nano .env
```

`.env` 文件示例：

```bash
# GitHub OAuth 配置
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# 加密密钥（32字节十六进制字符串）
ENCRYPTION_KEY=your_generated_256_bit_key_in_hex

# 应用基础 URL（本地开发时为 localhost）
APP_BASE_URL=http://localhost:8787
```

```bash
# 启动本地开发服务器测试
pnpm dev

# 测试 GitHub OAuth 登录功能
# 访问 http://localhost:8787 并尝试登录

# 测试本地构建是否成功
pnpm build

# 预览构建结果
pnpm preview
```

## 🗄️ 生产数据库配置

### 1. 创建生产数据库

```bash
# 创建生产 D1 数据库
npx wrangler d1 create your-prod-db-name

# 示例输出：
# ✅ Successfully created DB 'your-prod-db-name'
#
# [[d1_databases]]
# binding = "DB"
# database_name = "your-prod-db-name"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 2. 更新配置文件

将上面的输出信息更新到 `wrangler.jsonc`：

```jsonc
{
  "env": {
    "production": {
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "your-prod-db-name", // 👈 替换这里
          "database_id": "your-database-id", // 👈 替换这里
          "migrations_dir": "drizzle",
        },
      ],
      "vars": {
        "NODE_ENV": "production",
        "APP_BASE_URL": "https://your-app-name.pages.dev", // 👈 替换为实际域名
      },
      "assets": {
        "binding": "ASSETS",
        "directory": "./dist/client",
      },
    },
  },
}
```

> 📝 **注意**: `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET` 和 `ENCRYPTION_KEY` 等敏感变量应该在 Cloudflare Pages Dashboard 中设置，而不是在 `wrangler.jsonc` 中。

### 3. 运行生产数据库迁移

```bash
# 应用数据库迁移到生产环境
pnpm db:migrate:prod

# 验证迁移成功
npx wrangler d1 execute your-prod-db-name --env production --command "SELECT name FROM sqlite_master WHERE type='table';"
```

## 🌐 Cloudflare Pages 部署

### 方式一：通过 Dashboard 部署 (推荐新手)

#### 1. 连接 Git 仓库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **Pages**
3. 点击 **"Create a project"**
4. 选择 **"Connect to Git"**
5. 授权并选择你的 Git 仓库

#### 2. 配置构建设置

在部署配置页面设置：

| 配置项       | 值              |
| ------------ | --------------- |
| **项目名称** | `your-app-name` |
| **生产分支** | `main`          |
| **构建命令** | `pnpm build`    |
| **输出目录** | `dist/client`   |
| **根目录**   | `/`             |

#### 3. 设置环境变量

在 **Settings** → **Environment variables** 中添加以下环境变量：

#### 🔐 必需的环境变量（生产环境）

```bash
# 基础配置
NODE_ENV=production
VITE_PORT=5173

# GitHub OAuth 配置（从步骤2获取）
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# API 密钥加密（从步骤2生成）
ENCRYPTION_KEY=your_generated_256_bit_key_in_hex

# 应用基础 URL（替换为您的实际域名）
APP_BASE_URL=https://your-app-name.pages.dev
```

> ⚠️ **安全提醒**:
>
> - `GITHUB_CLIENT_SECRET` 和 `ENCRYPTION_KEY` 是敏感信息，务必保密
> - 在 Cloudflare Pages 中设置的环境变量会自动加密存储
> - `APP_BASE_URL` 必须与 GitHub OAuth 应用配置的域名一致

#### 4. 配置兼容性标志

在 **Settings** → **Functions** 中设置：

- **Compatibility date**: `2024-07-29`
- **Compatibility flags**: `nodejs_compat`

### 方式二：通过 CLI 部署 (推荐有经验开发者)

#### 1. 安装并登录 Wrangler

```bash
# 全局安装 Wrangler (如果尚未安装)
npm install -g wrangler

# 登录 Cloudflare
npx wrangler login
```

#### 2. 直接部署

```bash
# 构建并部署到生产环境
pnpm build
npx wrangler deploy --env production
```

## 🔧 高级部署配置

### 自定义域名配置

#### 1. 添加域名到 Cloudflare

1. 在 Cloudflare Dashboard 中添加你的域名
2. 更新域名的 DNS 服务器到 Cloudflare

#### 2. 配置 Pages 域名

1. 进入 **Pages** → **你的项目** → **Custom domains**
2. 点击 **"Set up a custom domain"**
3. 输入你的域名并验证

### 环境变量管理

#### 开发环境变量

```bash
# .env (本地开发)
NODE_ENV=development
VITE_PORT=5173
VITE_API_HOST=localhost
VITE_API_PORT=8787
DB_DEBUG=true
```

#### 生产环境变量

在 Cloudflare Pages 设置中配置：

```bash
NODE_ENV=production
VITE_PORT=5173
# 不要在生产环境设置 DB_DEBUG
```

### 安全配置

#### 1. 设置 CSP (内容安全策略)

```typescript
// src/index.ts
app.use("*", async (c, next) => {
  await next();
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  );
});
```

#### 2. 启用 HTTPS 重定向

在 Cloudflare Dashboard 的 **SSL/TLS** → **Edge Certificates** 中：

- 启用 **Always Use HTTPS**
- 设置 **SSL/TLS encryption mode** 为 **Full (strict)**

## 📊 部署后验证

### 1. AI 代理服务功能测试

#### 基础功能验证

```bash
# 替换为你的实际域名
export API_BASE="https://your-app.pages.dev"

# 1. 检查 API 文档是否可访问
curl $API_BASE/api/doc

# 2. 检查认证端点
curl $API_BASE/api/auth/github/login

# 3. 测试健康检查
curl $API_BASE/api/health
```

#### GitHub OAuth 流程测试

1. 访问您的应用 URL: `https://your-app.pages.dev`
2. 点击 "GitHub 登录" 按钮
3. 完成 GitHub OAuth 授权
4. 验证是否成功跳转并显示用户信息
5. 检查是否生成了 API 密钥

#### Claude API 代理测试

> 🔑 **前提**: 需要先通过 GitHub 登录获取 API 密钥

```bash
# 获取你的 API 密钥（登录后在仪表盘页面查看）
export YOUR_API_KEY="your-api-key-from-dashboard"

# 测试 Claude API 代理（需要先配置 API 提供商）
curl -X POST $API_BASE/api/claude/messages \
  -H "Authorization: Bearer $YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-haiku-20240307",
    "max_tokens": 100,
    "messages": [
      {
        "role": "user",
        "content": "Hello, this is a test message."
      }
    ]
  }'
```

#### Claude Code CLI 集成测试

部署完成后，您可以配置 Claude Code CLI 使用您的代理服务：

```bash
# 安装 Claude Code CLI（如果尚未安装）
npm install -g @anthropic-ai/claude-cli

# 配置 Claude Code 使用您的代理服务
claude config set \
  --api-key="your-api-key-from-dashboard" \
  --base-url="https://your-app.pages.dev/api/claude"

# 测试 Claude Code 是否正常工作
claude chat "Hello, this is a test message via Claude Code CLI"
```

### 2. 性能测试

- **页面加载速度**: 使用 [PageSpeed Insights](https://pagespeed.web.dev/)
- **SEO 检查**: 使用 [Google Search Console](https://search.google.com/search-console)
- **安全性检查**: 使用 [SSL Labs](https://www.ssllabs.com/ssltest/)
- **API 响应时间**: 监控 Claude API 代理的响应延迟

### 3. 监控设置

在 Cloudflare Dashboard 中启用：

- **Analytics**: 查看访问统计
- **Security**: 监控安全事件
- **Performance**: 性能监控

## 🔄 持续部署 (CI/CD)

### GitHub Actions 自动部署

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: your-project-name
          directory: dist/client
```

### 配置 Secrets

在 GitHub 仓库的 **Settings** → **Secrets** 中添加：

- `CLOUDFLARE_API_TOKEN`: Cloudflare API Token
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare Account ID

## 🚨 部署故障排除

### AI 代理服务特定问题

#### 1. GitHub OAuth 认证失败

**症状**: 点击 GitHub 登录后出现 404 或认证错误

**解决方案**:

```bash
# 检查环境变量配置
npx wrangler secret list --env production

# 验证 GitHub OAuth 应用配置
# 1. 回调 URL 必须是: https://your-domain.com/api/auth/github/callback
# 2. APP_BASE_URL 环境变量必须与实际域名一致
```

#### 2. API 密钥加密/解密失败

**症状**: 用户设置 API 提供商时报错，或 Claude API 调用失败

**解决方案**:

```bash
# 验证加密密钥是否正确设置（应该是64位十六进制字符串）
echo $ENCRYPTION_KEY | wc -c  # 应该输出 65（64字符 + 换行符）

# 重新生成加密密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 3. Claude API 代理调用失败

**症状**: Claude API 返回 502 或超时错误

**可能原因和解决方案**:

```bash
# 1. 检查用户是否正确配置了 API 提供商
# 2. 验证目标 API 服务是否可用
# 3. 检查模型映射规则是否正确
# 4. 确认 API 密钥是否有效

# 查看实时日志进行调试
npx wrangler tail --env production
```

#### 4. 流式响应中断

**症状**: Claude API 流式响应突然中断或不完整

**解决方案**:

```typescript
// 检查 Cloudflare Workers 的内存和 CPU 限制
// 流式响应需要确保 TransformStream 正确处理
```

### 常见部署错误

#### 1. 构建失败

```bash
# 错误：Module not found
# 解决：检查 frontend/vite.config.mts 中的 ssr.noExternal 配置

export default defineConfig({
  ssr: {
    noExternal: [
      'react-router-dom',
      '@mui/material',
      '@mui/system',
      // ... 添加缺失的模块
    ],
  },
});
```

#### 2. 数据库连接失败

```bash
# 检查生产数据库配置
npx wrangler d1 list

# 验证 database_id 是否正确
npx wrangler d1 info your-prod-db-name --env production
```

#### 3. 静态资源 404

检查 `wrangler.jsonc` 中的 assets 配置：

```jsonc
{
  "env": {
    "production": {
      "assets": {
        "binding": "ASSETS",
        "directory": "./dist/client", // 确保路径正确
      },
    },
  },
}
```

#### 4. API 路由不工作

确保在 `src/index.ts` 中正确注册了路由：

```typescript
// 检查路由是否正确挂载
app.route("/api", apiApp);
```

### 调试部署问题

#### 查看部署日志

```bash
# 在 Cloudflare Dashboard 的 Functions 页面查看实时日志
npx wrangler tail --env production
```

#### 本地模拟生产环境

```bash
# 使用生产环境配置在本地运行
npx wrangler dev --env production --remote
```

## 📈 部署优化

### 1. 性能优化

```typescript
// 启用缓存
app.use("*", cache({ cacheName: "static", maxAge: 31536000 }));

// 启用压缩
app.use("*", compress());
```

### 2. SEO 优化

确保 SEO 配置正确：

```bash
# 生成优化的 HTML 模板
pnpm generate:html

# 验证 robots.txt 和 sitemap.xml
curl https://your-app.pages.dev/robots.txt
curl https://your-app.pages.dev/sitemap.xml
```

### 3. 安全优化

```typescript
// 添加安全头
app.use("*", async (c, next) => {
  await next();
  c.header("X-Frame-Options", "DENY");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
});
```

## 🔄 更新部署

### 日常更新流程

```bash
# 1. 开发并测试新功能
pnpm dev

# 2. 更新数据库 schema (如需要)
pnpm db:generate
pnpm db:migrate:prod

# 3. 提交代码
git add .
git commit -m "Add new feature"
git push origin main

# 4. 自动部署 (如果配置了 CI/CD)
# 或手动部署
pnpm build
npx wrangler deploy --env production
```

### 回滚部署

```bash
# 查看部署历史
npx wrangler deployments list --env production

# 回滚到指定版本
npx wrangler rollback [deployment-id] --env production
```

## 🔄 下一步

部署完成后，建议了解：

- [🔧 故障排除](./TROUBLESHOOTING.md) - 解决生产环境问题
- [🔍 SEO 配置指南](./SEO_GUIDE.md) - 优化搜索引擎表现
- [🏛️ 项目架构](./ARCHITECTURE.md) - 深入了解技术架构

## ✅ AI 代理服务部署清单

在部署完成前，请确保完成以下所有步骤：

### 🔐 安全配置

- [ ] GitHub OAuth 应用已创建并配置正确的回调 URL
- [ ] 加密密钥已生成（64位十六进制字符串）
- [ ] 所有敏感环境变量已在 Cloudflare Pages 中设置
- [ ] APP_BASE_URL 与实际域名一致

### 🗄️ 数据库配置

- [ ] 生产 D1 数据库已创建
- [ ] 数据库迁移已成功应用
- [ ] wrangler.jsonc 中的数据库配置正确

### 🚀 部署配置

- [ ] Cloudflare Pages 项目已创建
- [ ] 构建设置正确（命令、输出目录等）
- [ ] 兼容性标志已设置（nodejs_compat）
- [ ] 静态资源绑定已配置

### 🧪 功能验证

- [ ] 应用首页可以正常访问
- [ ] GitHub OAuth 登录流程正常
- [ ] 用户仪表盘显示 API 密钥
- [ ] API 提供商配置功能正常
- [ ] Claude API 代理功能正常
- [ ] Claude Code CLI 集成测试通过

### 🔧 监控和维护

- [ ] Cloudflare Analytics 已启用
- [ ] 日志监控已设置
- [ ] 性能监控已配置
- [ ] 备份策略已制定

## 🎯 Claude Code CLI 快速集成

部署完成后，用户可以按以下步骤快速集成：

```bash
# 1. 访问您的代理服务网站
# 2. 使用 GitHub 登录
# 3. 在设置页面添加 API 提供商（如 OpenAI、Azure、Ollama 等）
# 4. 配置模型映射规则
# 5. 获取 API 密钥
# 6. 配置 Claude Code CLI
claude config set --api-key="your-api-key" --base-url="https://your-domain.com/api/claude"
```

## 💡 部署小贴士

### AI 代理服务专属建议

- **多提供商配置**: 建议配置多个 API 提供商作为备份
- **模型映射策略**: 合理设置模型关键词匹配规则
- **API 密钥安全**: 定期轮换加密密钥
- **用户权限管理**: 监控 GitHub OAuth 用户访问
- **流式响应优化**: 确保网络稳定性以支持长时间流式响应

### 通用部署建议

- **渐进发布**: 先部署到测试域名验证，再切换生产域名
- **数据备份**: 定期备份生产数据库
- **监控告警**: 设置 Cloudflare 的监控告警
- **域名管理**: 使用 Cloudflare 管理 DNS 可获得最佳性能
- **缓存策略**: 合理设置静态资源的缓存时间
