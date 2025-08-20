# 📋 安装配置指南

本指南将详细介绍 NekroEdge 模板的安装、配置和初始化过程。

## 📋 系统要求

### 必需环境

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0 (推荐) 或 npm >= 9.0.0
- **Git** (用于版本控制)

### 推荐工具

- **VS Code** + TypeScript 扩展
- **Chrome/Edge** (用于调试)
- **Cloudflare Account** (用于部署)

## 🚀 完整安装流程

### 1. 获取项目

#### 方式一：使用 GitHub 模板 (🌟 强烈推荐)

1. 访问 [NekroEdge 模板页面](https://github.com/KroMiose/nekro-edge-template)
2. 点击绿色的 **"Use this template"** 按钮
3. 选择 **"Create a new repository"**
4. 填写你的仓库名称和描述
5. 选择仓库可见性（公开/私有）
6. 点击 **"Create repository"**

```bash
# 克隆你新创建的仓库
git clone https://github.com/YOUR_USERNAME/your-project-name.git
cd your-project-name
```

> 💡 **为什么推荐这种方式？**
>
> - 自动创建独立的 Git 历史
> - 保持与原模板的松耦合关系
> - 方便后续获取模板更新
> - 符合 GitHub 的最佳实践

#### 方式二：Fork 仓库 (适合贡献代码)

如果你计划向原模板贡献代码，可以选择 Fork：

1. 在 [GitHub 模板页面](https://github.com/KroMiose/nekro-edge-template) 点击 **"Fork"**
2. 克隆你的 Fork

```bash
git clone https://github.com/YOUR_USERNAME/nekro-edge-template.git your-project-name
cd your-project-name
```

### 2. 安装依赖

```bash
# 使用 pnpm (推荐，更快更省空间)
pnpm install

# 或使用 npm
npm install
```

### 3. 初始化数据库

```bash
# 生成数据库迁移文件 (如果需要)
pnpm db:generate

# 运行数据库迁移，创建表结构
pnpm db:migrate

# 可选：打开数据库管理界面查看
pnpm db:studio
```

### 4. 启动开发环境

```bash
# 启动开发服务器
pnpm dev
```

### 5. 验证安装

访问以下地址确认安装成功：

- ✅ **前端**: http://localhost:5173 - 应显示项目首页
- ✅ **API**: http://localhost:8787/api/posts - 应返回 JSON 数据
- ✅ **文档**: http://localhost:8787/api/doc - 应显示 Swagger 文档

## ⚙️ 环境变量配置

### 创建环境配置文件

在项目根目录创建 `.env` 文件：

```bash
# 前端开发服务器配置
VITE_PORT=5173

# API 服务器配置
VITE_API_HOST=localhost
VITE_API_PORT=8787

# 开发环境标识
NODE_ENV=development

# 可选：数据库调试
DB_DEBUG=true
```

### 配置说明

| 变量名          | 说明               | 默认值        | 示例         |
| --------------- | ------------------ | ------------- | ------------ |
| `VITE_PORT`     | 前端开发服务器端口 | `5173`        | `3000`       |
| `VITE_API_HOST` | API 服务器主机     | `localhost`   | `127.0.0.1`  |
| `VITE_API_PORT` | API 服务器端口     | `8787`        | `8000`       |
| `NODE_ENV`      | 环境标识           | `development` | `production` |
| `DB_DEBUG`      | 数据库调试日志     | `false`       | `true`       |

## 🔧 开发工具配置

### VS Code 推荐扩展

创建 `.vscode/extensions.json`：

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "ms-vscode.vscode-json"
  ]
}
```

## 🚨 常见安装问题

### 端口冲突

如果 5173 或 8787 端口被占用：

```bash
# 修改 .env.vars 文件中的端口
VITE_PORT=3000
VITE_API_PORT=8000
```

### 数据库连接失败

```bash
# 清理并重新初始化数据库
rm -rf .wrangler
pnpm db:migrate
```

### 热重载不工作

1. 确认从正确端口访问 (5173 不是 8787)
2. 检查防火墙是否阻止 WebSocket 连接
3. 尝试重启开发服务器

```bash
# 停止服务器 (Ctrl+C) 然后重启
pnpm dev
```

## 🔄 下一步

安装完成后，建议阅读：

- [⚙️ 开发指南](./DEVELOPMENT.md) - 了解日常开发工作流
- [🎨 主题定制指南](./THEMING.md) - 自定义应用外观
- [🔌 API 开发指南](./API_GUIDE.md) - 创建后端功能

## 💡 小贴士

- 推荐使用 **pnpm** 而非 npm，速度更快且节省磁盘空间
- 开发时优先使用 **5173 端口**，享受热重载功能
- 遇到问题首先查看 **控制台日志**，大部分错误信息很明确
- 定期运行 `pnpm type-check` 确保类型安全
