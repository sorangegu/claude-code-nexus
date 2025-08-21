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
   - **Authorization callback URL**: `https://your-domain.com/auth/callback`
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

> 📝 **注意**: `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET` 和 `ENCRYPTION_KEY` 等敏感变量应该在 Cloudflare Pages Dashboard 中设置。

### 3. 运行生产数据库迁移

```bash
# 应用数据库迁移到生产环境
pnpm db:migrate:prod

# 验证迁移成功
npx wrangler d1 execute your-prod-db-name --env production --command "SELECT name FROM sqlite_master WHERE type='table';"
```

## 🌐 Cloudflare Pages 部署

### 方式一：通过 Dashboard 部署

#### 1. 连接 Git 仓库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **Pages**
3. 点击 **"Create a project"**
4. 选择 **"Connect to Git"**
5. 授权并选择你的 Git 仓库

#### 2. 配置构建设置

在部署配置页面设置：

| 配置项       | 值                                     |
| ------------ | -------------------------------------- |
| **项目名称** | `your-app-name`                        |
| **生产分支** | `main`                                 |
| **构建命令** | `pnpm build`                           |
| **部署命令** | `npx wrangler deploy --env production` |
| **根目录**   | `/`                                    |

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
