# **Cloudflare AI 代理服务应用开发需求文档 (PRD)**

版本: 2.0 (最终完整版)  
日期: 2025年8月14日  
项目代号: "Nexus"

## **1\. 项目愿景与目标**

### **1.1. 愿景**

创建一个部署在 Cloudflare 上的、高性能的 AI 代理服务平台 (SaaS)。该平台旨在打破 AI 开发工具与底层模型服务之间的壁垒，允许开发者通过统一的、兼容 claude code 的接口，无缝、安全地使用任何自定义的、兼容 OpenAI API 的大语言模型服务。

### **1.2. 核心目标**

* **解除供应商锁定**: 让 claude code CLI 及其他基于 Anthropic Claude API 的工具，能够灵活地调用包括 OpenAI 官方、Azure、Ollama 本地模型、以及 OneAPI 等第三方聚合服务在内的多种 LLM 后端。  
* **用户个性化配置**: 为每个用户提供独立、安全的配置空间，通过 GitHub 账号登录，自定义其 API 服务提供商和模型转发规则。  
* **极致的用户体验**: 提供一个简洁、直观的 Web 界面，让用户可以轻松完成配置，并清晰地了解如何将服务集成到他们的开发流程中。  
* **利用 Cloudflare 生态**: 充分利用 Cloudflare Workers、Pages 和 KV 的优势，构建一个高可用、低延迟、可扩展且成本效益高的无服务器应用。

### **1.3. 目标用户**

* 使用 claude code CLI 进行日常开发的软件工程师。  
* 希望统一管理和代理多个 OpenAI 兼容 API 服务的 AI 应用开发者。  
* 拥有自建或第三方 LLM 服务的团队，并希望将其集成到现有开发工具链中。

## **2\. 功能需求 (Functional Requirements)**

### **2.1. 核心代理功能**

* **Claude API 兼容性**:  
  * 必须完整实现 Claude API 的 /v1/messages 端点，并能正确处理 POST 请求。  
  * **必须完美支持流式响应 (SSE)**，精确模拟 Claude API 的事件流格式（message\_start, content\_block\_start, content\_block\_delta 等），这是确保 claude code 实时输出的关键。  
  * **必须完美支持工具使用 (Tool Use / Function Calling)**，包括请求的正确转换和响应中 tool\_use / tool\_result 块的精确解析与生成。  
  * 必须支持多模态输入，特别是 Base64 编码的图片。  
* **OpenAI API 转换**:  
  * **请求转换**: 将接收到的 Claude API 请求体（包括 system prompt, messages, tools, tool\_choice, stream 等参数）准确转换为 OpenAI Chat Completions API 的格式。  
  * **响应转换**: 将来自 OpenAI 兼容服务的响应（无论是单次 JSON 还是 SSE 流）准确转换回 Claude API 的响应格式。

### **2.2. 用户系统与个性化配置**

* **用户认证**:  
  * 系统必须支持通过 **GitHub OAuth** 进行用户注册和登录。  
  * 用户的 GitHub 账户信息（如用户名、头像）将用于界面展示。  
  * 每个用户在系统中拥有独立的数据空间。  
* **API 服务提供商管理**:  
  * 登录后，用户可以在管理界面上**添加、编辑和删除**自己的 API 服务提供商配置。  
  * 每个配置项至少包含：  
    * 名称 (例如: "我的 OneAPI 服务", "Azure GPT-4o")  
    * Base URL (例如: https://api.oneapi.com, https://my-resource.openai.azure.com)  
    * API Key (必须加密存储)  
* **模型转发规则自定义**:  
  * 用户可以创建自定义的模型映射规则。  
  * 规则定义应为 "当 Claude 请求的模型名称**包含**某个关键词时，将其转发到我指定的**某个 API 服务提供商**的**某个目标模型**上"。  
  * **示例**:  
    * 规则1: 如果模型名包含 haiku，则使用 我的 OneAPI 服务 的 gpt-4o-mini 模型。  
    * 规则2: 如果模型名包含 sonnet，则使用 Azure GPT-4o 的 gpt-4o-deployment 模型。  
    * 规则3 (默认): 对于其他所有请求，使用 OpenAI 官方 的 gpt-4o 模型。  
  * UI 应该允许用户方便地添加、编辑、删除和排序这些规则。规则按顺序匹配，第一个匹配的规则生效。

### **2.3. 用户界面 (UI/UX)**

* **整体风格**: 简洁、现代、友好。采用响应式设计，在桌面和移动设备上都有良好体验。技术栈推荐使用 React/Vue/Svelte 等现代前端框架。  
* **页面设计**:  
  1. **首页 (Landing Page)**:  
     * 清晰地介绍服务功能、优势和目标用户。  
     * 醒目的 "使用 GitHub 登录" 按钮。  
  2. **仪表盘 (Dashboard)**:  
     * 用户登录后的主页面。  
     * **核心展示区**: 清晰地展示用户专属的 ANTHROPIC\_BASE\_URL 和 ANTHROPIC\_API\_KEY。  
     * 提供一键复制功能。  
     * 提供简明的 claude code CLI 配置教程。  
     * 导航到“设置”页面的入口。  
  3. **设置页面 (Settings)**:  
     * **API 提供商管理**:  
       * 以卡片或列表形式展示已配置的 API 提供商。  
       * 提供 "添加新提供商" 的按钮，点击后弹出表单（名称, Base URL, API Key）。  
       * API Key 输入框应为密码类型，并且在保存后不应明文显示。  
       * 每个提供商卡片上应有 "编辑" 和 "删除" 按钮。  
     * **模型映射规则管理**:  
       * 以可拖拽排序的列表形式展示模型映射规则。  
       * 每条规则包含: 匹配关键词 (输入框), API 提供商 (下拉选择已配置的提供商), 目标模型名称 (输入框)。  
       * 提供 "添加新规则" 和 "保存更改" 的按钮。

## **3\. 技术架构与实现细节**

### **3.1. 技术栈**

* **前端**: Cloudflare Pages (部署 React/Vue/Svelte 等静态站点)。  
* **后端**: Cloudflare Workers (处理 API 请求、用户认证、配置管理)。  
* **数据存储**: Cloudflare KV (存储用户配置数据，如 API 提供商和模型映射规则)。  
* **认证**: Cloudflare Workers 内置的 OAuth 客户端或手动实现 GitHub OAuth 流程。

### **3.2. 数据流**

1. claude code CLI 将请求发送到用户的专属 ANTHROPIC\_BASE\_URL (即 Cloudflare Worker 的 URL)。  
2. Worker 验证请求头中的 ANTHROPIC\_API\_KEY，并解析出用户身份。  
3. Worker 从 KV 中读取该用户的 API 提供商和模型映射规则。  
4. 根据请求中的 model 名称和用户的映射规则，确定要使用的 Base URL、API Key 和 目标模型名称。  
5. Worker 将 Claude 请求体转换为 OpenAI 格式。  
6. Worker 将转换后的请求发送到目标 API 服务提供商。  
7. Worker 接收响应，如果是流式，则通过 TransformStream 实时转换；如果是非流式，则等待完整响应后转换。  
8. Worker 将转换后的 Claude 格式响应返回给 claude code CLI。

### **3.3. 数据模型 (KV 存储)**

* **User Session**: session:{session\_id} \-\> { "github\_user\_id": "...", "expires\_at": ... }  
* **User Profile**: user:{github\_user\_id} \-\> { "username": "...", "avatar\_url": "..." }  
* **User API Providers**: providers:{github\_user\_id} \-\> \[{ "id": "uuid", "name": "...", "baseUrl": "...", "apiKey": "encrypted\_key" }, ...\]  
* **User Model Mappings**: mappings:{github\_user\_id} \-\> \[{ "id": "uuid", "keyword": "haiku", "providerId": "uuid", "targetModel": "gpt-4o-mini" }, ...\]

### **3.4. 安全考量**

* **API 密钥加密**: 用户在前端输入的 API Key 应该在发送到 Worker 后立即加密，再存入 KV。Worker 在使用时解密。可以使用 Cloudflare Workers 的 SubtleCrypto API。  
* **用户数据隔离**: 所有 KV 键都必须以用户 ID 为前缀，确保用户只能访问自己的数据。  
* **CORS**: Worker 需要配置正确的 CORS 策略，允许来自前端页面的请求。

## **4\. AI 开发所需背景知识**

* **Cloudflare Workers**: 你需要理解其无服务器、事件驱动的本质。熟悉 fetch 事件处理、Request 和 Response 对象、环境变量和 Secrets 的使用，以及如何与 KV 交互。  
* **流式处理 (Streaming)**: claude code 的体验高度依赖于流式响应。你必须熟练使用 Web Streams API，特别是 TransformStream，以便在 Worker 中实现低延迟的、实时的 SSE 格式转换。**这是本项目的技术难点和核心**。  
* **API 格式差异**: 你需要深刻理解 Claude Messages API 和 OpenAI Chat Completions API 在请求结构、响应结构、特别是流式事件格式上的细微差别。参考我们之前分析的 Python 项目逻辑是最佳实践。  
* **GitHub OAuth**: 你需要了解标准的 OAuth 2.0 授权码流程，以便在 Worker 中实现安全的 GitHub 登录。  
* **OneAPI 等聚合服务**: 你需要知道这类服务本身就是一个 OpenAI 接口的代理和统一管理平台。我们的应用是架设在这类服务之上的更高层代理，为 claude code 等特定工具提供兼容性。

## **5\. 技术实现附录 (Technical Implementation Appendix)**

**引言:** 本附录旨在为 AI 开发者提供将 Claude API 请求/响应与 OpenAI API 格式进行双向转换所需的全部技术细节。所有规则和接口定义均基于 claude-code-proxy Python 项目的成功实践，以确保最终实现的兼容性。

### **5.1. 核心接口定义**

#### **5.1.1. Claude API (Messages) \- 请求体**

{  
  "model": "claude-3-5-sonnet-20240620",  
  "max\_tokens": 4096,  
  "messages": \[  
    {  
      "role": "user",  
      "content": \[  
        { "type": "text", "text": "Hello, world" },  
        {  
          "type": "image",  
          "source": {  
            "type": "base64",  
            "media\_type": "image/jpeg",  
            "data": "\<base64\_encoded\_image\_data\>"  
          }  
        }  
      \]  
    },  
    {  
      "role": "assistant",  
      "content": \[  
        {  
          "type": "tool\_use",  
          "id": "toolu\_01A09q90qw90lq917835lq9",  
          "name": "get\_weather",  
          "input": { "location": "San Francisco" }  
        }  
      \]  
    },  
    {  
      "role": "user",  
      "content": \[  
        {  
          "type": "tool\_result",  
          "tool\_use\_id": "toolu\_01A09q90qw90lq917835lq9",  
          "content": "{\\"temperature\\": 72, \\"unit\\": \\"fahrenheit\\"}"  
        }  
      \]  
    }  
  \],  
  "system": "You are a helpful assistant.",  
  "temperature": 1.0,  
  "stream": false,  
  "tools": \[  
    {  
      "name": "get\_weather",  
      "description": "Get the current weather in a given location",  
      "input\_schema": {  
        "type": "object",  
        "properties": {  
          "location": { "type": "string", "description": "The city and state, e.g. San Francisco, CA" }  
        },  
        "required": \["location"\]  
      }  
    }  
  \],  
  "tool\_choice": { "type": "auto" }  
}

#### **5.1.2. OpenAI API (Chat Completions) \- 请求体**

{  
  "model": "gpt-4o",  
  "max\_tokens": 4096,  
  "messages": \[  
    { "role": "system", "content": "You are a helpful assistant." },  
    {  
      "role": "user",  
      "content": \[  
        { "type": "text", "text": "Hello, world" },  
        {  
          "type": "image\_url",  
          "image\_url": {  
            "url": "data:image/jpeg;base64,\<base64\_encoded\_image\_data\>"  
          }  
        }  
      \]  
    },  
    {  
      "role": "assistant",  
      "content": null,  
      "tool\_calls": \[  
        {  
          "id": "toolu\_01A09q90qw90lq917835lq9",  
          "type": "function",  
          "function": {  
            "name": "get\_weather",  
            "arguments": "{\\"location\\":\\"San Francisco\\"}"  
          }  
        }  
      \]  
    },  
    {  
      "role": "tool",  
      "tool\_call\_id": "toolu\_01A09q90qw90lq917835lq9",  
      "content": "{\\"temperature\\": 72, \\"unit\\": \\"fahrenheit\\"}"  
    }  
  \],  
  "temperature": 1.0,  
  "stream": false,  
  "tools": \[  
    {  
      "type": "function",  
      "function": {  
        "name": "get\_weather",  
        "description": "Get the current weather in a given location",  
        "parameters": {  
          "type": "object",  
          "properties": {  
            "location": { "type": "string", "description": "The city and state, e.g. San Francisco, CA" }  
          },  
          "required": \["location"\]  
        }  
      }  
    }  
  \],  
  "tool\_choice": "auto"  
}

### **5.2. 请求转换规则 (Claude \-\> OpenAI)**

| Claude 字段 | OpenAI 字段 | 转换规则 |
| :---- | :---- | :---- |
| model | model | 根据用户自定义的**模型映射规则**进行转换。 |
| system | messages 数组首位 | 转换为 { "role": "system", "content": "..." } 并置于 messages 数组的第一个元素。 |
| messages | messages | 逐条转换，详见下方的 **Message 转换规则**。 |
| max\_tokens | max\_tokens | 直接映射。 |
| temperature | temperature | 直接映射。 |
| stream | stream | 直接映射。 |
| tools | tools | 转换为 \[{ "type": "function", "function": { ... } }\] 格式。input\_schema 字段重命名为 parameters。 |
| tool\_choice | tool\_choice | {"type": "auto"} \-\> "auto"; {"type": "any"} \-\> "required"; {"type": "tool", "name": "..."} \-\> {"type": "function", "function": {"name": "..."}}。 |

#### **Message 转换规则 (Claude \-\> OpenAI)**

| Claude Message content 类型 | OpenAI Message 格式 |
| :---- | :---- |
| role: "user", content: \[{ "type": "text", ... }\] | { "role": "user", "content": "..." } |
| role: "user", content: \[{ "type": "image", ... }\] | { "role": "user", "content": \[{ "type": "image\_url", "image\_url": { "url": "data:..." } }\] } |
| role: "assistant", content: \[{ "type": "tool\_use", ... }\] | { "role": "assistant", "tool\_calls": \[{ "id": ..., "type": "function", "function": { "name": ..., "arguments": JSON.stringify(...) } }\] } |
| role: "user", content: \[{ "type": "tool\_result", ... }\] | { "role": "tool", "tool\_call\_id": ..., "content": "..." } |

### **5.3. 响应转换规则 (OpenAI \-\> Claude)**

#### **5.3.1. 非流式响应**

| OpenAI 响应字段 | Claude 响应字段 | 转换规则 |
| :---- | :---- | :---- |
| id | id | 直接映射。 |
| model | model | 直接映射。 |
| choices\[0\].message.content | content 数组 | 转换为 { "type": "text", "text": "..." } 并放入 content 数组。 |
| choices\[0\].message.tool\_calls | content 数组 | 遍历 tool\_calls，每个都转换为 { "type": "tool\_use", "id": ..., "name": ..., "input": JSON.parse(...) } 并放入 content 数组。 |
| choices\[0\].finish\_reason | stop\_reason | "stop" \-\> "end\_turn"; "length" \-\> "max\_tokens"; "tool\_calls" \-\> "tool\_use". |
| usage.prompt\_tokens | usage.input\_tokens | 直接映射。 |
| usage.completion\_tokens | usage.output\_tokens | 直接映射。 |

#### **5.3.2. 流式响应 (SSE) \- 核心实现**

代理必须严格按照以下顺序和格式生成 SSE 事件流，以模拟 Claude API。

| 步骤 | 触发条件 | 发送的 Claude 事件 | 事件 data 示例 |
| :---- | :---- | :---- | :---- |
| 1 | 收到 OpenAI 流的第一个数据块 | ping | { "type": "ping" } |
| 2 | (紧随步骤1之后) | message\_start | { "type": "message\_start", "message": { "id": "...", "role": "assistant", ... } } |
| 3 | OpenAI 流中出现第一个 delta.content | content\_block\_start (for text) | { "type": "content\_block\_start", "index": 0, "content\_block": { "type": "text", "text": "" } } |
| 4 | OpenAI 流中每个 delta.content | content\_block\_delta (text\_delta) | { "type": "content\_block\_delta", "index": 0, "delta": { "type": "text\_delta", "text": "..." } } |
| 5 | OpenAI 流中出现第一个 delta.tool\_calls\[i\] (包含 id 和 name) | content\_block\_start (for tool\_use) | { "type": "content\_block\_start", "index": i+1, "content\_block": { "type": "tool\_use", "id": "...", "name": "...", "input": {} } } |
| 6 | OpenAI 流中每个 delta.tool\_calls\[i\].function.arguments | content\_block\_delta (input\_json\_delta) | { "type": "content\_block\_delta", "index": i+1, "delta": { "type": "input\_json\_delta", "partial\_json": "..." } } |
| 7 | OpenAI 流结束 (\[DONE\]) | content\_block\_stop (for each block) | { "type": "content\_block\_stop", "index": ... } |
| 8 | (紧随步骤7之后) | message\_delta | { "type": "message\_delta", "delta": { "stop\_reason": "...", ... }, "usage": { ... } } |
| 9 | (紧随步骤8之后) | message\_stop | { "type": "message\_stop" } |

**关键实现要点:**

* **状态管理**: 在处理流的过程中，需要维护状态，例如当前已经开启了哪些 content block（文本或工具），以及每个 tool call 累积的 arguments 字符串。  
* **索引计数**: index 字段必须正确递增。通常第一个文本块是 index: 0，后续的工具使用块依次为 1, 2, ...。  
* **事件顺序**: 必须严格保证 \_start, \_delta, \_stop 事件的正确配对和顺序。
