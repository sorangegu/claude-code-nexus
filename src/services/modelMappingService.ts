import { eq } from "drizzle-orm";
import { userModelConfig } from "../db/schema";
import {
  getDefaultMappingConfig,
  findTargetModel as findTargetModelFromConfig,
  type ModelMappingConfig,
  FIXED_MODEL_RULES,
  DEFAULT_API_CONFIG,
} from "../config/defaultModelMappings";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as drizzleSchema from "../db/schema";
import { createId } from "@paralleldrive/cuid2";

export interface UserModelConfigData {
  useSystemMapping: boolean;
  customMapping?: ModelMappingConfig;
}

/**
 * 模型映射服务 - 重构为模式切换
 */
export class ModelMappingService {
  constructor(private db: DrizzleD1Database<typeof drizzleSchema>) {}

  /**
   * 获取用户的模型配置
   * @param userId 用户ID
   * @returns 用户模型配置
   */
  async getUserModelConfig(userId: string): Promise<UserModelConfigData> {
    const config = await this.db.query.userModelConfig.findFirst({
      where: eq(userModelConfig.userId, userId),
    });

    if (!config) {
      // 返回默认配置：使用系统映射
      return {
        useSystemMapping: true,
        customMapping: undefined,
      };
    }

    const customMapping =
      config.customHaiku && config.customSonnet && config.customOpus
        ? {
            haiku: config.customHaiku,
            sonnet: config.customSonnet,
            opus: config.customOpus,
          }
        : undefined;

    return {
      useSystemMapping: config.useSystemMapping,
      customMapping,
    };
  }

  /**
   * 更新用户模型配置
   * @param userId 用户ID
   * @param configData 新的配置数据
   */
  async updateUserModelConfig(userId: string, configData: UserModelConfigData): Promise<void> {
    const existingConfig = await this.db.query.userModelConfig.findFirst({
      where: eq(userModelConfig.userId, userId),
    });

    const updateData = {
      useSystemMapping: configData.useSystemMapping,
      customHaiku: configData.customMapping?.haiku || null,
      customSonnet: configData.customMapping?.sonnet || null,
      customOpus: configData.customMapping?.opus || null,
      updatedAt: new Date(),
    };

    if (existingConfig) {
      await this.db.update(userModelConfig).set(updateData).where(eq(userModelConfig.userId, userId));
    } else {
      await this.db.insert(userModelConfig).values({
        id: createId(),
        userId,
        ...updateData,
        createdAt: new Date(),
      });
    }
  }

  /**
   * 重置用户映射到系统默认配置
   * @param userId 用户ID
   * @returns 重置后的配置
   */
  async resetToSystemMapping(userId: string): Promise<UserModelConfigData> {
    const resetConfig: UserModelConfigData = {
      useSystemMapping: true,
      customMapping: undefined,
    };

    await this.updateUserModelConfig(userId, resetConfig);
    return resetConfig;
  }

  /**
   * 获取当前生效的映射配置
   * @param userId 用户ID
   * @returns 当前生效的映射配置
   */
  async getEffectiveMappingConfig(userId: string): Promise<ModelMappingConfig> {
    const userConfig = await this.getUserModelConfig(userId);

    if (userConfig.useSystemMapping || !userConfig.customMapping) {
      return getDefaultMappingConfig();
    }

    return userConfig.customMapping;
  }

  /**
   * 根据模型名称查找映射的目标模型
   * @param userId 用户ID
   * @param modelName 模型名称
   * @returns 映射的目标模型名称
   */
  async findTargetModel(userId: string, modelName: string): Promise<string> {
    const effectiveConfig = await this.getEffectiveMappingConfig(userId);
    return findTargetModelFromConfig(modelName, effectiveConfig);
  }

  /**
   * 获取固定的模型规则（用于前端显示）
   * @returns 固定的三个模型规则
   */
  getFixedModelRules() {
    return FIXED_MODEL_RULES;
  }

  /**
   * 获取默认API配置
   * @returns 默认API配置
   */
  getDefaultApiConfig() {
    return DEFAULT_API_CONFIG;
  }
}
