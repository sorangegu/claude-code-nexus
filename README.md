# Claude Code Nexus

> 🤖 **基于 Cloudflare 的 AI 代理服务平台 - 让 Claude Code 无缝调用任何 OpenAI 兼容的 LLM 服务**

[![部署状态](https://img.shields.io/badge/部署-在线-brightgreen)](https://edge.nekro.ai/) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

这是一个基于 **NekroEdge** 模板构建的高性能 AI 代理服务平台，使用 **Hono + React + D1** 技术栈，专为 Claude Code CLI 等工具提供完整的 Claude API 兼容层，支持将请求路由到 OpenAI、Azure、Ollama、OneAPI 等多种后端服务。

## 🌟 在线演示

体验模板基础功能：**[https://edge.nekro.ai/](https://edge.nekro.ai/)**

## ✨ 核心特性

### 🤖 AI 代理服务

- 🔄 **完美兼容**: 100% 兼容 Claude API，支持流式响应和工具调用
- 🎯 **智能路由**: 基于模型名称关键词的自动路由到不同 API 提供商
- 🔐 **多重认证**: GitHub OAuth + API 密钥双重安全保障
- ⚡ **高性能**: 基于 Cloudflare Workers 的全球分布式架构
- 🛠️ **易于配置**: 直观的 Web 界面管理 API 提供商和路由规则

### 🏗️ 技术架构

- 🏗️ **全栈框架**: Hono + React - 在 Cloudflare Workers 上的完整解决方案
- ⚡ **现代开发**: Vite + TypeScript - 闪电般的开发体验
- 🎨 **UI 组件**: Material-UI + UnoCSS - 完整的设计系统
- 🗄️ **数据库**: Cloudflare D1 + Drizzle ORM - 类型安全的无服务器数据库
- 🌙 **主题系统**: 内置亮/暗模式切换
- 📖 **自动文档**: 集成 Swagger UI
- 🚀 **一键部署**: 完整的 Cloudflare Pages 配置

## 🚀 5分钟快速开始

### 1. 创建项目

```bash
git clone https://github.com/KroMiose/nekro-edge-template.git your-project-name
cd your-project-name
pnpm install
```

### 2. 启动开发

```bash
pnpm dev
```

### 3. 访问应用

- 🔥 **前端开发**: http://localhost:5173 (推荐，支持热重载)
- 🔗 **完整应用**: http://localhost:8787
- 📚 **API 文档**: http://localhost:8787/api/doc

🎉 **就这么简单！** 开始构建你的应用吧！

## 🚀 快速部署到生产环境

### 1. 准备环境变量

```bash
# 1. 创建 GitHub OAuth 应用: https://github.com/settings/developers
# 2. 生成加密密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. 部署数据库

```bash
# 创建生产数据库
npx wrangler d1 create your-app-db
# 应用数据库迁移
pnpm db:migrate:prod
```

### 3. 部署应用

```bash
# 构建和部署
pnpm build
npx wrangler deploy --env production
```

### 4. 配置环境变量

在 Cloudflare Pages Dashboard 中设置：

- `GITHUB_CLIENT_ID` - GitHub OAuth 客户端 ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth 客户端密钥
- `ENCRYPTION_KEY` - 32字节十六进制加密密钥
- `APP_BASE_URL` - 您的应用域名

📖 **详细步骤**: 查看 [完整部署指南](./docs/DEPLOYMENT.md)

## 📚 完整文档

### 🤖 AI 代理服务

- [🚀 AI 代理服务完整指南](./docs/AI_PROXY_GUIDE.md) - **从配置到部署的完整教程**
- [⚙️ Claude Code 集成指南](./docs/AI_PROXY_GUIDE.md#claude-code-集成) - 配置 Claude Code CLI
- [🔧 API 提供商配置](./docs/AI_PROXY_GUIDE.md#api-提供商配置) - 管理多个 LLM 服务

### 🛠️ 开发指南

- [📋 安装配置指南](./docs/INSTALLATION.md) - 详细的环境搭建和配置
- [⚙️ 开发指南](./docs/DEVELOPMENT.md) - 日常开发工作流和最佳实践
- [🎨 主题定制指南](./docs/THEMING.md) - 自定义应用外观和主题
- [🔌 API 开发指南](./docs/API_GUIDE.md) - 创建和管理后端 API

### 🚀 部署运维

- [📦 部署指南](./docs/DEPLOYMENT.md) - **完整的生产环境部署流程**
  - 🔐 GitHub OAuth 配置
  - 🗄️ Cloudflare D1 数据库设置
  - 🌐 Cloudflare Pages 部署
  - 🧪 AI 代理服务功能验证
  - ✅ 详细的部署清单
- [🔧 故障排除](./docs/TROUBLESHOOTING.md) - 常见问题解决方案

### 📖 深度了解

- [🏛️ 项目架构](./docs/ARCHITECTURE.md) - 技术栈和设计决策
- [🔍 SEO 配置指南](./docs/SEO_GUIDE.md) - 搜索引擎优化配置

## 🎯 适合谁使用

- ✅ 想在 Cloudflare 生态快速构建应用的开发者
- ✅ 需要类型安全和现代开发体验的团队
- ✅ 寻找生产级全栈模板的项目
- ✅ 喜欢无服务器架构的技术栈

## 🤝 社区支持

- 🐛 [报告问题](https://github.com/KroMiose/nekro-edge-template/issues)
- 💬 [讨论区](https://github.com/KroMiose/nekro-edge-template/discussions)
- ⭐ 觉得有用请给个 Star！

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

---

**开始构建你的下一个伟大应用吧！** 🚀
