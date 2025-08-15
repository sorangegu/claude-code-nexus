import { OpenAPIHono } from "@hono/zod-openapi";
import { and, eq, gt } from "drizzle-orm";
import { users, userSessions } from "../db/schema";
import { encryptApiKey, decryptApiKey } from "../utils/encryption";
import {
  getUserConfigRoute,
  updateUserConfigRoute,
  resetMappingsRoute,
  UpdateUserConfigSchema,
} from "@common/validators/config.schema";
import { ModelMappingService } from "../services/modelMappingService";
import { authMiddleware } from "../middleware/auth";
import type { Bindings } from "../types";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as drizzleSchema from "../db/schema";

type Variables = {
  db: DrizzleD1Database<typeof drizzleSchema>;
  user: typeof drizzleSchema.users.$inferSelect;
};

const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();

app.use("/*", authMiddleware);

app
  .openapi(getUserConfigRoute, async (c) => {
    const user = c.get("user");
    const db = c.get("db");
    const mappingService = new ModelMappingService(db);

    const modelConfig = await mappingService.getUserModelConfig(user.id);

    const providerApiKey = user.encryptedProviderApiKey
      ? await decryptApiKey(user.encryptedProviderApiKey, c.env.ENCRYPTION_KEY)
      : null;

    // 始终返回默认baseUrl和用户的apiKey
    const defaultApiConfig = mappingService.getDefaultApiConfig();

    return c.json({
      provider: {
        baseUrl: defaultApiConfig.baseUrl,
        apiKey: providerApiKey || "",
      },
      modelConfig,
    });
  })
  .openapi(updateUserConfigRoute, async (c) => {
    const user = c.get("user");
    const db = c.get("db");
    const mappingService = new ModelMappingService(db);
    const { provider, modelConfig } = await c.req.json();

    if (provider && provider.apiKey) {
      await db
        .update(users)
        .set({
          encryptedProviderApiKey: await encryptApiKey(provider.apiKey, c.env.ENCRYPTION_KEY),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    if (modelConfig) {
      await mappingService.updateUserModelConfig(user.id, modelConfig);
    }

    const updatedUser = await db.query.users.findFirst({ where: eq(users.id, user.id) });
    const updatedModelConfig = await mappingService.getUserModelConfig(user.id);
    const decryptedApiKey = updatedUser?.encryptedProviderApiKey
      ? await decryptApiKey(updatedUser.encryptedProviderApiKey, c.env.ENCRYPTION_KEY)
      : null;

    const defaultApiConfig = mappingService.getDefaultApiConfig();

    return c.json({
      provider: {
        baseUrl: defaultApiConfig.baseUrl,
        apiKey: decryptedApiKey || "",
      },
      modelConfig: updatedModelConfig,
    });
  })

  .openapi(resetMappingsRoute, async (c) => {
    const user = c.get("user");
    const db = c.get("db");
    const mappingService = new ModelMappingService(db);

    const modelConfig = await mappingService.resetToSystemMapping(user.id);

    const providerApiKey = user.encryptedProviderApiKey
      ? await decryptApiKey(user.encryptedProviderApiKey, c.env.ENCRYPTION_KEY)
      : null;

    const defaultApiConfig = mappingService.getDefaultApiConfig();

    return c.json({
      provider: {
        baseUrl: defaultApiConfig.baseUrl,
        apiKey: providerApiKey || "",
      },
      modelConfig,
    });
  });

export default app;
