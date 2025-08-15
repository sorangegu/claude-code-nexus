# Claude Code Nexus

[中文版](README.md) | English

> 🤖 **A Claude API Proxy Service Platform - Seamlessly Compatible with Any OpenAI API Service for Claude Code CLI**

[![Deployment Status](https://img.shields.io/badge/Deployment-Online-brightgreen)](https://claude.nekro.ai/) [![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE) [![QQ Group 1](<https://img.shields.io/badge/QQ_Group1-636925153(Nearly_Full)-12B7F3?style=flat-square&logo=tencentqq>)](https://qm.qq.com/q/eT30LxDcSA) [![QQ Group 2](<https://img.shields.io/badge/QQ_Group2-679808796(New)-12B7F3?style=flat-square&logo=tencentqq>)](https://qm.qq.com/q/ZQ6QHdkXu0) [![Discord](https://img.shields.io/badge/Discord-Join_Channel-5865F2?style=flat-square&logo=discord)](https://discord.gg/eMsgwFnxUB)

**Claude Code Nexus** is a high-performance AI proxy service platform deployed on Cloudflare. It's specifically designed for [Claude Code CLI](https://github.com/claude-code/cli), providing a compatibility layer that allows you to seamlessly forward Claude Code requests to **any OpenAI-compatible API service**, such as OneAPI, Azure OpenAI, local Ollama, or any other LLM service that follows the OpenAI specification.

## ✨ Core Value

- **🔓 Vendor Unlock**: No longer locked to a single AI service provider. You can freely choose the service with the best cost-performance ratio and performance.
- **🔌 Seamless Compatibility**: 100% compatible with Claude Messages API, including streaming responses (SSE), tool use (Tool Use), and multimodal input.
- **🎯 Smart Model Mapping**: Easily configure model mapping rules on the web (e.g., map `claude-3-haiku` to `gpt-4o-mini`), with no changes needed in Claude Code CLI.
- **🔐 Secure & Reliable**: API Keys are encrypted and stored in the database, with strict user data isolation.
- **🚀 Global Acceleration**: Based on Cloudflare's global network, providing low-latency, high-availability access for your AI applications.
- **🌍 Open Source & Controllable**: The project is completely open source, allowing you to deploy, modify, and extend it yourself, with complete control over your data and services.

## 🚀 Quick Start (3 Steps)

### 1. Login & Get API Key

Visit **[https://claude.nekro.ai/](https://claude.nekro.ai/)** and log in with your GitHub account. The system will automatically generate a dedicated API Key for you.

### 2. Configure Your Backend Service

In the console, configure your OpenAI-compatible API service. You'll need to provide:

- **Base URL**: Your API service address (e.g., `https://api.oneapi.com`)
- **API Key**: Your API service secret key

### 3. Use in Claude Code

Set the following environment variables in your terminal:

```bash
# 1. Set your dedicated API Key
export ANTHROPIC_API_KEY="ak-your-nexus-key"

# 2. Set the proxy service address
export ANTHROPIC_BASE_URL="https://claude.nekro.ai"

# 3. Use Claude Code normally!
claude "Write a hello world in Rust"
```

🎉 **Done!** Now your Claude Code CLI is proxied through Claude Code Nexus, using your own backend service.

## 🛠️ Tech Stack

- **Backend**: [Hono](https://hono.dev/) on [Cloudflare Workers](https://workers.cloudflare.com/) - Lightweight, fast edge computing backend.
- **Frontend**: [React](https://react.dev/) + [Vite](https://vitejs.dev/) on [Cloudflare Pages](https://pages.cloudflare.com/) - Modern, efficient frontend development experience.
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) + [Drizzle ORM](https://orm.drizzle.team/) - Type-safe serverless SQL database.
- **UI**: [Material-UI](https://mui.com/) - Mature, beautiful React component library.
- **Authentication**: GitHub OAuth.

## 📚 Documentation

We provide comprehensive project requirements and implementation details:

- [**Project Requirements Document (PRD)**](./REQUIREMENTS.md) - Deep dive into the project's design philosophy, functional architecture, and technical implementation details.

## 🔗 Related Projects

If you're looking for a highly extensible AI Agent framework, we recommend checking out our other project:

**[Nekro Agent](https://github.com/KroMiose/nekro-agent)** - A multi-platform chat robot framework that combines code execution capabilities with high extensibility. Features sandbox-driven execution, visual interface, highly extensible plugin system, and native support for QQ, Discord, Minecraft, Bilibili Live, and other platforms. If you need to build intelligent chatbots or automated Agent systems, Nekro Agent will be your ideal choice.

---

## 🤝 Contributing

Welcome to participate in the project through the following ways:

- 🐛 **Report Issues**: [Submit bugs in GitHub Issues](https://github.com/KroMiose/claude-code-nexus/issues)
- 💡 **Suggest Ideas**: [Share your thoughts in GitHub Discussions](https://github.com/KroMiose/claude-code-nexus/discussions)
- ⭐ If you find this project helpful, please give it a **Star**!

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
