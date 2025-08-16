import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  IconButton,
  Paper,
  useTheme,
  TextField,
  CircularProgress,
  Autocomplete,
  Chip,
} from "@mui/material";
import {
  ContentCopy as CopyIcon,
  Save as SaveIcon,
  CloudDownload as CloudDownloadIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  AutoMode as AutoModeIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
} from "@mui/icons-material";
import { useAuth, fetchWithAuth } from "../hooks/useAuth";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  ProviderConfigSchema,
  UserConfigSchema,
  ModelMappingConfigSchema,
  UserModelConfigSchema,
  UpdateUserConfigSchema,
} from "../../../common/validators/config.schema";
import {
  PRESET_API_PROVIDERS,
  FIXED_MODEL_RULES,
  DEFAULT_MAPPING_CONFIG,
} from "../../../src/config/defaultModelMappings";

type ProviderData = z.infer<typeof ProviderConfigSchema>;
type ModelMappingConfig = z.infer<typeof ModelMappingConfigSchema>;
type UserModelConfig = z.infer<typeof UserModelConfigSchema>;

export function DashboardPage() {
  const theme = useTheme();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [provider, setProvider] = useState<ProviderData>({
    baseUrl: "https://api.nekro.ai/v1",
    apiKey: "",
  });
  const [modelConfig, setModelConfig] = useState<UserModelConfig>({
    useSystemMapping: true,
    customMapping: undefined,
  });
  const [initialState, setInitialState] = useState<{ provider: ProviderData; modelConfig: UserModelConfig }>({
    provider: { baseUrl: "https://api.nekro.ai/v1", apiKey: "" },
    modelConfig: {
      useSystemMapping: true,
      customMapping: undefined,
    },
  });

  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [hasFetchedConfig, setHasFetchedConfig] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);

  const isDirty = JSON.stringify({ provider, modelConfig }) !== JSON.stringify(initialState);

  // Fetch initial config
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading && !hasFetchedConfig) {
      console.log("Fetching config...");
      setHasFetchedConfig(true);
      fetchWithAuth("/api/config")
        .then((res) => {
          if (!res.ok) throw new Error("Network response was not ok");
          return res.json();
        })
        .then((data: any) => {
          console.log("Config data received:", data);

          // 检查是否有本地存储的自定义配置需要恢复
          let finalModelConfig = data.modelConfig as UserModelConfig;
          if (data.modelConfig.useSystemMapping) {
            const savedMapping = restoreCustomMappingFromStorage();
            if (savedMapping) {
              finalModelConfig = {
                ...data.modelConfig,
                customMapping: savedMapping,
              };
            }
          }

          setProvider(data.provider as ProviderData);
          setModelConfig(finalModelConfig);
          setInitialState({
            provider: data.provider as ProviderData,
            modelConfig: finalModelConfig,
          });
        })
        .catch((err) => {
          console.error("Failed to fetch config:", err);
          setHasFetchedConfig(false); // 允许重试
        })
        .finally(() => setIsLoadingConfig(false));
    }
  }, [isAuthenticated, isAuthLoading, hasFetchedConfig]);

  // Handle form submission
  const handleSubmit = async () => {
    const result = UpdateUserConfigSchema.safeParse({ provider, modelConfig });
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }
    setErrors({});

    try {
      const response = await fetchWithAuth("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, modelConfig }),
      });
      const updatedConfig: z.infer<typeof UserConfigSchema> = await response.json();
      setProvider(updatedConfig.provider as ProviderData);
      setModelConfig(updatedConfig.modelConfig);
      setInitialState({ provider: updatedConfig.provider as ProviderData, modelConfig: updatedConfig.modelConfig });

      // 保存自定义配置到本地存储
      if (updatedConfig.modelConfig.customMapping && !updatedConfig.modelConfig.useSystemMapping) {
        saveCustomMappingToStorage(updatedConfig.modelConfig.customMapping);
      }
    } catch (error) {
      console.error("Error updating config:", error);
    }
  };

  // 从用户配置的API提供商获取模型列表
  const fetchModels = async () => {
    if (!provider?.apiKey) {
      alert("请先配置API Key");
      return;
    }

    setIsFetchingModels(true);
    try {
      const response = await fetch(new URL("/v1/models", provider.baseUrl), {
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const { data } = (await response.json()) as { data: { id: string }[] };
      const models = data
        .map((model) => ({ id: model.id, name: model.id }))
        .sort((a, b) => a.name.localeCompare(b.name)); // 按字母顺序排序
      setModels(models);
    } catch (error) {
      console.error("Error fetching models:", error);
      alert("获取模型列表失败，请检查API Key和Base URL是否正确");
    } finally {
      setIsFetchingModels(false);
    }
  };

  // 模型配置处理函数
  const toggleMappingMode = (useSystem: boolean) => {
    if (useSystem) {
      // 切换到系统默认时，保存当前自定义配置
      if (modelConfig.customMapping && !modelConfig.useSystemMapping) {
        saveCustomMappingToStorage(modelConfig.customMapping);
      }
      setModelConfig({
        useSystemMapping: true,
        customMapping: undefined,
      });
    } else {
      // 切换到自定义配置时，优先使用保存的配置，其次使用当前配置，最后使用默认值
      const savedMapping = restoreCustomMappingFromStorage();
      const currentMapping = modelConfig.customMapping;

      setModelConfig({
        useSystemMapping: false,
        customMapping: savedMapping || currentMapping || DEFAULT_MAPPING_CONFIG,
      });
    }
  };

  // 保存当前自定义配置到本地存储，避免切换时丢失
  const saveCustomMappingToStorage = (mapping: any) => {
    if (mapping && !modelConfig.useSystemMapping) {
      localStorage.setItem("claude-code-nexus-custom-mapping", JSON.stringify(mapping));
    }
  };

  // 从本地存储恢复自定义配置
  const restoreCustomMappingFromStorage = () => {
    const saved = localStorage.getItem("claude-code-nexus-custom-mapping");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved custom mapping:", e);
      }
    }
    return null;
  };

  const updateCustomMapping = (model: keyof ModelMappingConfig, value: string) => {
    setModelConfig({
      ...modelConfig,
      customMapping: {
        haiku: modelConfig.customMapping?.haiku || "",
        sonnet: modelConfig.customMapping?.sonnet || "",
        opus: modelConfig.customMapping?.opus || "",
        [model]: value,
      } as ModelMappingConfig,
    });
  };

  // 重置到系统默认配置
  const resetToSystemMapping = async () => {
    try {
      const response = await fetchWithAuth("/api/config/reset", {
        method: "POST",
      });
      if (response.ok) {
        const data: z.infer<typeof UserConfigSchema> = await response.json();
        setModelConfig(data.modelConfig);
        setInitialState({ provider, modelConfig: data.modelConfig });
      } else {
        console.error("Failed to reset mappings");
      }
    } catch (error) {
      console.error("Error resetting mappings:", error);
    }
  };

  // 创建可复用的模型映射行组件
  const ModelMappingRow = ({
    modelKey,
    rule,
    systemValue,
    customValue,
    onCustomChange,
  }: {
    modelKey: keyof ModelMappingConfig;
    rule: { keyword: string; description: string };
    systemValue: string;
    customValue: string;
    onCustomChange: (value: string) => void;
  }) => (
    <Grid container spacing={2} sx={{ mb: 2, alignItems: "center" }}>
      <Grid item xs={12} md={3}>
        <TextField
          value={rule.keyword}
          label="模型类型"
          fullWidth
          disabled
          sx={{
            "& .MuiInputBase-input.Mui-disabled": {
              WebkitTextFillColor: theme.palette.text.primary,
              opacity: 0.7,
            },
          }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <Autocomplete
          options={models.map((m) => m.name)}
          value={modelConfig.useSystemMapping ? systemValue : customValue}
          onChange={(event, newValue) => onCustomChange(newValue || "")}
          disabled={modelConfig.useSystemMapping}
          freeSolo
          renderInput={(params) => (
            <TextField
              {...params}
              label="目标模型"
              error={!!errors.modelConfig?.customMapping?.[modelKey]}
              helperText={errors.modelConfig?.customMapping?.[modelKey]?.[0]}
            />
          )}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <Typography variant="body2" color="text.secondary">
          {rule.description}
        </Typography>
      </Grid>
    </Grid>
  );

  if (isAuthLoading || isLoadingConfig) {
    return <CircularProgress />;
  }

  if (!isAuthenticated) {
    return <Alert severity="info">请先登录以访问控制台</Alert>;
  }

  const baseUrl = window.location.origin;
  const anthropicBaseUrl = baseUrl;

  // 格式化 API Key 显示，中间部分用 * 表示
  const formatApiKeyForDisplay = (apiKey: string) => {
    if (!apiKey || apiKey.length <= 16) return apiKey; // 如果长度不够，直接返回
    const prefix = apiKey.substring(0, 8);
    const suffix = apiKey.substring(apiKey.length - 8);
    const middle = "*".repeat(Math.max(0, apiKey.length - 16));
    return `${prefix}${middle}${suffix}`;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        控制台
      </Typography>

      {/* API Key Info */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6">CLI 配置</Typography>
          <Paper sx={{ p: 2, my: 2 }}>
            <Typography variant="body2" color="text.secondary">
              ANTHROPIC_BASE_URL
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography sx={{ fontFamily: "monospace", flexGrow: 1 }}>{anthropicBaseUrl}</Typography>
              <IconButton onClick={() => navigator.clipboard.writeText(anthropicBaseUrl)}>
                <CopyIcon />
              </IconButton>
            </Box>
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              ANTHROPIC_API_KEY
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography sx={{ fontFamily: "monospace", flexGrow: 1 }}>
                {formatApiKeyForDisplay(user?.apiKey || "")}
              </Typography>
              <IconButton onClick={() => navigator.clipboard.writeText(user?.apiKey || "")}>
                <CopyIcon />
              </IconButton>
            </Box>
          </Paper>
        </CardContent>
      </Card>

      {/* API 服务提供商配置 */}
      <Card sx={{ mb: 4 }}>
        {/* API 服务提供商配置 */}
        <CardContent>
          <Typography variant="h6">API 服务提供商</Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <Autocomplete
                  options={PRESET_API_PROVIDERS}
                  getOptionLabel={(option) => (typeof option === "string" ? option : option.name)}
                  value={provider?.baseUrl || ""}
                  onChange={(event, newValue) => {
                    if (typeof newValue === "string") {
                      setProvider((p) => ({ ...p, baseUrl: newValue }));
                      setSelectedProvider(null);
                    } else if (newValue) {
                      setProvider((p) => ({ ...p, baseUrl: newValue.baseUrl }));
                      setSelectedProvider(null);
                    }
                  }}
                  freeSolo
                  sx={{ flexGrow: 1 }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="OpenAI 源站 Base URL"
                      error={!!errors.provider?.baseUrl}
                      placeholder={errors.provider?.baseUrl?.[0] || "选择预设供应商或输入自定义地址"}
                      fullWidth
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {option.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.baseUrl}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
                {provider?.baseUrl && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      try {
                        const url = new URL(provider.baseUrl);
                        const baseUrl = `${url.protocol}//${url.host}`;
                        window.open(baseUrl, "_blank");
                      } catch (error) {
                        console.error("Invalid URL:", error);
                      }
                    }}
                    sx={{ minWidth: "100px", height: "56px" }}
                    title="前往源站"
                  >
                    前往源站
                  </Button>
                )}
              </Box>
              {selectedProvider && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                  {selectedProvider.description}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                value={provider?.apiKey || ""}
                onChange={(e) => setProvider((p) => ({ ...p, apiKey: e.target.value }))}
                label="OpenAI 源站 API Key"
                type="password"
                fullWidth
                error={!!errors.provider?.apiKey}
                placeholder={errors.provider?.apiKey?.[0] || "请输入您的API密钥"}
              />
            </Grid>
          </Grid>
        </CardContent>
        {/* 模型映射配置 */}
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h6">模型映射配置</Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button onClick={fetchModels} startIcon={<CloudDownloadIcon />} disabled={isFetchingModels}>
                {isFetchingModels ? "正在获取..." : "获取模型列表"}
              </Button>
            </Box>
          </Box>

          {/* 模式切换控件 */}
          <Box
            sx={{
              mb: 3,
              p: 2,
              bgcolor: "background.paper",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                {modelConfig.useSystemMapping ? (
                  <AutoModeIcon sx={{ mr: 1, color: "primary.main" }} />
                ) : (
                  <SettingsIcon sx={{ mr: 1, color: "secondary.main" }} />
                )}
                <Typography variant="subtitle1" sx={{ mr: 2 }}>
                  {modelConfig.useSystemMapping ? "系统默认映射" : "自定义映射"}
                </Typography>
                <Chip
                  label={modelConfig.useSystemMapping ? "自动" : "自定义"}
                  size="small"
                  color={modelConfig.useSystemMapping ? "primary" : "secondary"}
                  variant="outlined"
                />
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  系统默认
                </Typography>
                <IconButton
                  onClick={() => toggleMappingMode(!modelConfig.useSystemMapping)}
                  color={!modelConfig.useSystemMapping ? "secondary" : "primary"}
                >
                  {modelConfig.useSystemMapping ? <ToggleOffIcon /> : <ToggleOnIcon />}
                </IconButton>
                <Typography variant="body2" color="text.secondary">
                  自定义配置
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* 固定的三个模型映射 */}
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Claude 模型映射配置
          </Typography>

          {/* 使用可复用组件渲染模型映射行 */}
          {FIXED_MODEL_RULES.map((rule) => {
            const modelKey = rule.keyword as keyof ModelMappingConfig;
            const systemValue = DEFAULT_MAPPING_CONFIG[modelKey];
            const customValue = modelConfig.customMapping?.[modelKey] || "";

            return (
              <ModelMappingRow
                key={modelKey}
                modelKey={modelKey}
                rule={rule}
                systemValue={systemValue}
                customValue={customValue}
                onCustomChange={(value) => updateCustomMapping(modelKey, value)}
              />
            );
          })}

          <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button onClick={resetToSystemMapping} startIcon={<RefreshIcon />} variant="outlined">
              重置到系统默认
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              size="large"
              startIcon={<SaveIcon />}
              disabled={!isDirty}
            >
              保存配置
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Claude Code 使用教程 */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, display: "flex", alignItems: "center" }}>
            <Box
              component="span"
              sx={{
                display: "inline-block",
                width: 24,
                height: 24,
                borderRadius: "50%",
                bgcolor: "primary.main",
                color: "white",
                textAlign: "center",
                lineHeight: "24px",
                fontSize: "14px",
                fontWeight: "bold",
                mr: 2,
              }}
            >
              💻
            </Box>
            Claude Code 使用教程
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: "primary.main" }}>
              1️⃣ 安装 Node.js（已安装可跳过）
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              确保 Node.js 版本 ≥ 18.0
            </Typography>
            <Box
              component="pre"
              sx={{
                bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.100",
                p: 2,
                borderRadius: 1,
                overflow: "auto",
                fontSize: "0.875rem",
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <code>{`# Ubuntu / Debian 用户
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo bash -
sudo apt-get install -y nodejs
node --version

# macOS 用户
brew install node
node --version`}</code>
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: "primary.main" }}>
              2️⃣ 安装 Claude Code
            </Typography>
            <Box
              component="pre"
              sx={{
                bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.100",
                p: 2,
                borderRadius: 1,
                overflow: "auto",
                fontSize: "0.875rem",
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <code>{`npm install -g @anthropic-ai/claude-code
claude --version`}</code>
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: "primary.main" }}>
              3️⃣ 开始使用
            </Typography>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>变量配置：</strong>请将以下环境变量配置到您的终端环境中，Claude Code 将自动使用这些配置
              </Typography>
            </Alert>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: "background.paper",
                    borderRadius: 1,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
                    您的API Key (ANTHROPIC_AUTH_TOKEN)
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                      variant="body2"
                      component="code"
                      sx={{
                        flex: 1,
                        p: 1,
                        bgcolor: theme.palette.mode === "dark" ? "grey.800" : "grey.50",
                        borderRadius: 0.5,
                        fontSize: "0.75rem",
                        wordBreak: "break-all",
                      }}
                    >
                      {user?.apiKey ? `${user.apiKey.substring(0, 20)}...` : "ak-..."}
                    </Typography>
                    {user?.apiKey && (
                      <IconButton
                        size="small"
                        onClick={() => navigator.clipboard.writeText(user.apiKey)}
                        title="复制API Key"
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    这是您在我们系统的专属API Key
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: "background.paper",
                    borderRadius: 1,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
                    代理地址 (ANTHROPIC_BASE_URL)
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                      variant="body2"
                      component="code"
                      sx={{
                        flex: 1,
                        p: 1,
                        bgcolor: theme.palette.mode === "dark" ? "grey.800" : "grey.50",
                        borderRadius: 0.5,
                        fontSize: "0.75rem",
                      }}
                    >
                      https://claude.nekro.ai
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => navigator.clipboard.writeText("https://claude.nekro.ai")}
                      title="复制代理地址"
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    我们的Claude API代理服务地址
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              在您的项目目录下运行：
            </Typography>
            <Box
              component="pre"
              sx={{
                bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.100",
                p: 2,
                borderRadius: 1,
                overflow: "auto",
                fontSize: "0.875rem",
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <code>{`# 如果需要在终端中自动使用配置，可以以下内容添加到 \`.bashrc\` 或 \`.zshrc\` 中
export ANTHROPIC_AUTH_TOKEN="${user?.apiKey || "ak-your-api-key"}"
export ANTHROPIC_BASE_URL="https://claude.nekro.ai"

# 运行 Claude Code
claude`}</code>
            </Box>
          </Box>

          <Alert severity="success">
            <Typography variant="body2">
              <strong>提示：</strong>配置完成后，Claude Code
              将使用您设置的模型映射规则，自动将Claude模型请求转换为对应的目标模型。
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* 修复完成：
      1. Base URL 现在可以编辑，不再是固定的
      2. 修改自定义模型后能正确触发 isDirty 状态，保存按钮可以点击 */}
    </Container>
  );
}
