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
  Switch,
  FormControlLabel,
  Autocomplete,
  Chip,
  Tooltip,
  Divider,
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
    modelConfig: { useSystemMapping: true, customMapping: undefined },
  });

  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [hasFetchedConfig, setHasFetchedConfig] = useState(false);

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
          setProvider(data.provider as ProviderData);
          setModelConfig(data.modelConfig as UserModelConfig);
          setInitialState({
            provider: data.provider as ProviderData,
            modelConfig: data.modelConfig as UserModelConfig,
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
      const models = data.map((model) => ({ id: model.id, name: model.id }));
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
    setModelConfig({
      useSystemMapping: useSystem,
      customMapping: useSystem
        ? undefined
        : modelConfig.customMapping || {
            haiku: "gpt-4o-mini",
            sonnet: "gpt-4o",
            opus: "gpt-4o",
          },
    });
  };

  const updateCustomMapping = (model: keyof ModelMappingConfig, value: string) => {
    if (!modelConfig.customMapping) return;
    setModelConfig({
      ...modelConfig,
      customMapping: {
        ...modelConfig.customMapping,
        [model]: value,
      },
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

  if (isAuthLoading || isLoadingConfig) {
    return <CircularProgress />;
  }

  if (!isAuthenticated) {
    return <Alert severity="info">请先登录以访问仪表盘</Alert>;
  }

  const baseUrl = window.location.origin;
  const anthropicBaseUrl = `${baseUrl}/api/claude`;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        仪表盘与配置
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
              <Typography sx={{ fontFamily: "monospace", flexGrow: 1 }}>{user?.apiKey}</Typography>
              <IconButton onClick={() => navigator.clipboard.writeText(user?.apiKey || "")}>
                <CopyIcon />
              </IconButton>
            </Box>
          </Paper>
        </CardContent>
      </Card>

      {/* Provider Config Card */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6">API 服务提供商</Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                value={provider?.baseUrl || ""}
                label="Base URL"
                fullWidth
                disabled
                helperText="使用平台默认API端点，遵循OpenAI标准接口格式"
                sx={{
                  "& .MuiInputBase-input.Mui-disabled": {
                    WebkitTextFillColor: theme.palette.text.primary,
                    opacity: 0.7,
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                value={provider?.apiKey || ""}
                onChange={(e) => setProvider((p) => ({ ...p, apiKey: e.target.value }))}
                label="API Key"
                type="password"
                fullWidth
                error={!!errors.provider?.apiKey}
                helperText={errors.provider?.apiKey?.[0] || "请输入您的API密钥"}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 模型映射配置卡片 */}
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h6">模型映射配置</Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button onClick={fetchModels} startIcon={<CloudDownloadIcon />} disabled={isFetchingModels}>
                {isFetchingModels ? "正在获取..." : "获取模型列表"}
              </Button>
              <Button onClick={resetToSystemMapping} startIcon={<RefreshIcon />} variant="outlined">
                重置到系统默认
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

          {/* Haiku 映射 */}
          <Grid container spacing={2} sx={{ mb: 2, alignItems: "center" }}>
            <Grid item xs={12} md={3}>
              <TextField
                value="haiku"
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
                value={modelConfig.useSystemMapping ? "gpt-4o-mini" : modelConfig.customMapping?.haiku || ""}
                onChange={(event, newValue) => updateCustomMapping("haiku", newValue || "")}
                disabled={modelConfig.useSystemMapping}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="目标模型"
                    error={!!errors.modelConfig?.customMapping?.haiku}
                    helperText={errors.modelConfig?.customMapping?.haiku?.[0] || "从上方获取模型列表后选择，或手动输入"}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body2" color="text.secondary">
                轻量级模型，在快速响应和简单任务中使用
              </Typography>
            </Grid>
          </Grid>

          {/* Sonnet 映射 */}
          <Grid container spacing={2} sx={{ mb: 2, alignItems: "center" }}>
            <Grid item xs={12} md={3}>
              <TextField
                value="sonnet"
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
                value={modelConfig.useSystemMapping ? "gpt-4o" : modelConfig.customMapping?.sonnet || ""}
                onChange={(event, newValue) => updateCustomMapping("sonnet", newValue || "")}
                disabled={modelConfig.useSystemMapping}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="目标模型"
                    error={!!errors.modelConfig?.customMapping?.sonnet}
                    helperText={
                      errors.modelConfig?.customMapping?.sonnet?.[0] || "从上方获取模型列表后选择，或手动输入"
                    }
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body2" color="text.secondary">
                平衡性能的通用模型，在大多数场景中使用
              </Typography>
            </Grid>
          </Grid>

          {/* Opus 映射 */}
          <Grid container spacing={2} sx={{ mb: 2, alignItems: "center" }}>
            <Grid item xs={12} md={3}>
              <TextField
                value="opus"
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
                value={modelConfig.useSystemMapping ? "gpt-4o" : modelConfig.customMapping?.opus || ""}
                onChange={(event, newValue) => updateCustomMapping("opus", newValue || "")}
                disabled={modelConfig.useSystemMapping}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="目标模型"
                    error={!!errors.modelConfig?.customMapping?.opus}
                    helperText={errors.modelConfig?.customMapping?.opus?.[0] || "从上方获取模型列表后选择，或手动输入"}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="body2" color="text.secondary">
                高性能模型，在复杂推理编码任务中使用
              </Typography>
            </Grid>
          </Grid>

          {!modelConfig.useSystemMapping && (
            <Alert severity="info" sx={{ mt: 2 }}>
              您正在使用自定义映射配置。请确保目标模型在您的API提供商处可用。
            </Alert>
          )}
        </CardContent>
      </Card>

      <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={handleSubmit} variant="contained" size="large" startIcon={<SaveIcon />} disabled={!isDirty}>
          保存配置
        </Button>
      </Box>

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
                <strong>配置信息：</strong>使用以下信息配置Claude Code，让它通过我们的代理访问您的API服务：
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
              <code>{`cd your-project-folder
export ANTHROPIC_AUTH_TOKEN=${user?.apiKey || "ak-your-api-key"}
export ANTHROPIC_BASE_URL=https://claude.nekro.ai
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
    </Container>
  );
}
