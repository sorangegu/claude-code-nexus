# Claude Code Nexus

> 🤖 **一个 Claude API 代理服务平台 - 让 Claude Code CLI 无缝兼容任何 OpenAI API 服务**

[![部署状态](https://img.shields.io/badge/部署-在线-brightgreen)](https://claude.nekro.ai/) [![构建状态](https://img.shields.io/github/actions/workflow/status/KroMiose/claude-code-nexus/deploy.yml?branch=main)](https://github.com/KroMiose/claude-code-nexus/actions) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**Claude Code Nexus** 是一个部署在 Cloudflare 上的高性能 AI 代理服务平台。它专为 [Claude Code CLI](https://github.com/claude-code/cli) 设计，通过一个兼容层，让你可以将 Claude Code 的请求无缝转发到**任何 OpenAI 兼容的 API 服务**，例如 OneAPI、Azure OpenAI、本地的 Ollama，或是其他任何遵循 OpenAI 规范的 LLM 服务。

## ✨ 核心价值

- **🔓 供应商解锁**: 不再被锁定在单一的 AI 服务提供商。你可以自由选择性价比最高、性能最好的服务。
- **🔌 无缝兼容**: 100% 兼容 Claude Messages API，包括流式响应 (SSE)、工具使用 (Tool Use) 和多模态输入。
- **🎯 智能模型映射**: 在网页上轻松配置模型映射规则（例如，将 `claude-3-haiku` 映射到 `gpt-4o-mini`），Claude Code CLI 无需任何改动。
- **🔐 安全可靠**: API Key 在数据库中加密存储，用户数据严格隔离。
- **🚀 全球加速**: 基于 Cloudflare 的全球网络，为你的 AI 应用提供低延迟、高可用的访问体验。
- **🌍 开源可控**: 项目完全开源，你可以自行部署、修改和扩展，数据和服务完全由你掌控。

## 🚀 快速开始 (3步)

### 1. 登录 & 获取 API Key

访问 **[https://claude.nekro.ai/](https://claude.nekro.ai/)**，使用你的 GitHub 账户登录。系统会自动为你生成一个专属的 API Key。

### 2. 配置你的后端服务

在控制台中，配置你的 OpenAI 兼容 API 服务。你需要提供：

- **Base URL**: 你的 API 服务地址 (例如: `https://api.oneapi.com`)
- **API Key**: 你的 API 服务密钥

### 3. 在 Claude Code 中使用

在你的终端中设置以下环境变量：

```bash
# 1. 设置你的专属 API Key
export ANTHROPIC_API_KEY="ak-your-nexus-key"

# 2. 设置代理服务地址
export ANTHROPIC_BASE_URL="https://claude.nekro.ai"

# 3. 正常使用 Claude Code！
claude "用 Rust 写一个 hello world"
```

🎉 **完成！** 现在你的 Claude Code CLI 已经通过 Claude Code Nexus 代理，使用你自己的后端服务了。

## 🛠️ 技术栈

- **后端**: [Hono](https://hono.dev/) on [Cloudflare Workers](https://workers.cloudflare.com/) - 轻量、快速的边缘计算后端。
- **前端**: [React](https://react.dev/) + [Vite](https://vitejs.dev/) on [Cloudflare Pages](https://pages.cloudflare.com/) - 现代、高效的前端开发体验。
- **数据库**: [Cloudflare D1](https://developers.cloudflare.com/d1/) + [Drizzle ORM](https://orm.drizzle.team/) - 类型安全的无服务器 SQL 数据库。
- **UI**: [Material-UI](https://mui.com/) - 成熟、美观的 React 组件库。
- **认证**: GitHub OAuth。

## 📚 文档

我们提供了完整的项目需求和实现细节文档：

- [**项目需求文档 (PRD)**](./REQUIREMENTS.md) - 深入了解项目的设计理念、功能架构和技术实现细节。

## 🤝 参与贡献

欢迎通过以下方式参与项目：

- 🐛 **报告问题**: [在 GitHub Issues 中提交 Bug](https://github.com/KroMiose/claude-code-nexus/issues)
- 💡 **提出建议**: [在 GitHub Discussions 中分享你的想法](https://github.com/KroMiose/claude-code-nexus/discussions)
- ⭐ 如果你觉得这个项目对你有帮助，请给一个 **Star**！

## 📄 许可证

本项目基于 [MIT License](./LICENSE) 开源。
