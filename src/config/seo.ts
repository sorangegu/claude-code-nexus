/**
 * 集中化的SEO配置文件
 * 其他开发者只需要修改这一个文件即可完成所有SEO配置
 */

export interface SEOConfig {
  // 基础信息
  siteName: string;
  siteUrl: string;
  title: string;
  description: string;
  keywords: string[];
  author: string;
  language: string;

  // 社交媒体
  ogImage: string;
  twitterHandle?: string;

  // 品牌色彩
  themeColor: string;

  // 页面配置
  pages: {
    [path: string]: {
      title?: string;
      description?: string;
      keywords?: string[];
      changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
      priority?: number;
    };
  };
}

/**
 * 默认SEO配置
 * 🎯 用户只需要修改这个配置对象即可完成整站SEO设置
 */
export const seoConfig: SEOConfig = {
  // 🌟 基础网站信息（必须修改）
  siteName: "Claude Code Nexus",
  siteUrl: "https://claude.nekro.ai",
  title: "Claude Code Nexus - 自由切换后端的 Claude Code CLI 代理平台",
  description:
    "一个开源的 Claude API 代理服务平台，让您的 Claude Code CLI 无缝兼容任何 OpenAI API 服务，如 OneAPI、Azure OpenAI 或本地 Ollama。提供多用户隔离、图形化配置和开源自部署能力。",
  keywords: [
    "Claude Code",
    "Claude API",
    "OpenAI",
    "API Proxy",
    "API Gateway",
    "OneAPI",
    "Ollama",
    "Anthropic",
    "Cloudflare",
    "Hono",
    "React",
    "开源",
    // 兼容模型供应商
    "Gemini",
    "通义千问",
    "Qwen",
    "豆包",
    "Kimi",
    "Moonshot AI",
    "智谱清言",
    "Zhipu AI",
    "ChatGLM",
    "百度千帆",
    "Baidu Qianfan",
    "科大讯飞",
    "Spark",
    "百川",
    "Baichuan",
    "腾讯混元",
    "Hunyuan",
    "商汤日日新",
    "SenseNova",
  ],
  author: "Claude Code Nexus Team",
  language: "zh-CN",

  // 🎨 社交媒体和品牌
  ogImage: "/og-image.png", // 建议在 public 目录下创建一个 og-image.png
  themeColor: "#4A90E2", // Claude-like blue color

  // 📄 页面级配置
  pages: {
    "/": {
      title: "Claude Code Nexus - 首页 | 兼容 OpenAI 的 Claude API 代理",
      description:
        "了解如何使用 Claude Code Nexus 将您的 Claude Code CLI 连接到任何 OpenAI 兼容的 API 服务，实现模型自由、降低成本。",
      changefreq: "monthly",
      priority: 1.0,
    },
    "/dashboard": {
      title: "控制台 - Claude Code Nexus",
      description: "管理您的 API Key、配置后端 OpenAI 服务地址、自定义模型映射规则。",
      changefreq: "yearly",
      priority: 0.5,
    },
  },
};

/**
 * 生成页面的完整标题
 */
export function generatePageTitle(path: string): string {
  const pageConfig = seoConfig.pages[path];
  return pageConfig?.title || `${seoConfig.title} | ${seoConfig.siteName}`;
}

/**
 * 生成页面描述
 */
export function generatePageDescription(path: string): string {
  const pageConfig = seoConfig.pages[path];
  return pageConfig?.description || seoConfig.description;
}

/**
 * 生成页面关键词
 */
export function generatePageKeywords(path: string): string {
  const pageConfig = seoConfig.pages[path];
  const keywords = pageConfig?.keywords || seoConfig.keywords;
  return keywords.join(",");
}

/**
 * 生成完整的页面URL
 */
export function generatePageUrl(path: string): string {
  return `${seoConfig.siteUrl}${path === "/" ? "" : path}`;
}
