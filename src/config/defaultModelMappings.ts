/**
 * 固定的三个模型映射配置
 *
 * Claude 只支持这三个固定的模型系列：haiku、sonnet、opus
 * 用户可以选择使用系统默认映射或配置自定义映射
 */

export interface ModelMappingRule {
  keyword: string;
  description: string;
}

export interface ModelMappingConfig {
  haiku: string;
  sonnet: string;
  opus: string;
}

// 固定的三个模型规则
export const FIXED_MODEL_RULES: ModelMappingRule[] = [
  {
    keyword: "haiku",
    description: "轻量级模型，在快速响应和简单任务中使用",
  },
  {
    keyword: "sonnet",
    description: "平衡性能的通用模型，在大多数场景中使用",
  },
  {
    keyword: "opus",
    description: "高性能模型，在复杂推理编码任务中使用",
  },
];

// 系统默认映射配置
export const DEFAULT_MAPPING_CONFIG: ModelMappingConfig = {
  haiku: "gemini-2.5-flash-nothinking",
  sonnet: "gemini-2.5-pro",
  opus: "gemini-2.5-pro",
};

// 默认的 API 配置
export const DEFAULT_API_CONFIG = {
  baseUrl: "https://api.nekro.ai/v1",
  name: "Nekro AI",
};

/**
 * 获取系统默认映射配置
 */
export function getDefaultMappingConfig(): ModelMappingConfig {
  return { ...DEFAULT_MAPPING_CONFIG };
}

/**
 * 根据模型关键词查找目标模型
 * @param keyword 模型关键词
 * @param config 映射配置
 * @returns 目标模型名称，如果没有找到则返回原关键词
 */
export function findTargetModel(keyword: string, config: ModelMappingConfig): string {
  const normalizedKeyword = keyword.toLowerCase();

  // 精确匹配或包含关键词
  for (const rule of FIXED_MODEL_RULES) {
    if (normalizedKeyword.includes(rule.keyword)) {
      return config[rule.keyword as keyof ModelMappingConfig];
    }
  }

  // 如果没有匹配到，返回原关键词
  return keyword;
}

/**
 * 验证映射配置是否完整
 * @param config 映射配置
 * @returns 是否有效
 */
export function isValidMappingConfig(config: any): config is ModelMappingConfig {
  return (
    config &&
    typeof config.haiku === "string" &&
    config.haiku.length > 0 &&
    typeof config.sonnet === "string" &&
    config.sonnet.length > 0 &&
    typeof config.opus === "string" &&
    config.opus.length > 0
  );
}
