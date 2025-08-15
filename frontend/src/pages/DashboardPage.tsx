import React from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Alert,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  useTheme,
} from "@mui/material";
import {
  ContentCopy as CopyIcon,
  GitHub as GitHubIcon,
  Settings as SettingsIcon,
  Key as KeyIcon,
  Link as LinkIcon,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useApiProviders, useModelMappings } from "../hooks/useConfig";

export function DashboardPage() {
  const theme = useTheme();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { data: providers } = useApiProviders();
  const { data: mappings } = useModelMappings();

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // 可以添加成功通知
    } catch (error) {
      console.error("复制失败:", error);
      // 可以添加错误通知
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>加载中...</Typography>
      </Container>
    );
  }

  if (!isAuthenticated) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          请先登录以访问仪表盘
        </Alert>
      </Container>
    );
  }

  const baseUrl = window.location.origin;
  const anthropicBaseUrl = `${baseUrl}/v1`;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* 页面标题 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          AI 代理服务仪表盘
        </Typography>
        <Typography variant="body1" color="text.secondary">
          管理您的 API 提供商和模型映射规则，配置 Claude Code CLI 进行无缝访问
        </Typography>
      </Box>

      {/* 用户信息 */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <GitHubIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6">用户信息</Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                用户名
              </Typography>
              <Typography variant="body1">{user?.username}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                邮箱
              </Typography>
              <Typography variant="body1">{user?.email || "未设置"}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                注册时间
              </Typography>
              <Typography variant="body1">
                {user?.createdAt ? new Date(user.createdAt).toLocaleString() : "未知"}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* API 配置信息 */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <KeyIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6">Claude Code CLI 配置</Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            将以下配置信息复制到您的环境变量或 .env 文件中，即可在 Claude Code CLI 中使用您的代理服务
          </Alert>

          <Paper sx={{ p: 2, mb: 2, backgroundColor: theme.palette.grey[50] }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                ANTHROPIC_BASE_URL
              </Typography>
              <Tooltip title="复制到剪贴板">
                <IconButton size="small" onClick={() => handleCopyToClipboard(anthropicBaseUrl)}>
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="body1" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
              {anthropicBaseUrl}
            </Typography>
          </Paper>

          <Paper sx={{ p: 2, backgroundColor: theme.palette.grey[50] }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                ANTHROPIC_API_KEY
              </Typography>
              <Tooltip title="复制到剪贴板">
                <IconButton size="small" onClick={() => handleCopyToClipboard(user?.apiKey || "")}>
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="body1" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
              {user?.apiKey}
            </Typography>
          </Paper>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              使用示例
            </Typography>
            <Paper sx={{ p: 2, backgroundColor: theme.palette.grey[50] }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                在终端中设置环境变量：
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace", mb: 2 }}>
                export ANTHROPIC_BASE_URL="{anthropicBaseUrl}"
                <br />
                export ANTHROPIC_API_KEY="{user?.apiKey}"
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                或创建 .env 文件：
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                ANTHROPIC_BASE_URL={anthropicBaseUrl}
                <br />
                ANTHROPIC_API_KEY={user?.apiKey}
              </Typography>
            </Paper>
          </Box>
        </CardContent>
      </Card>

      {/* 统计信息 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h4" color="primary.main">
                {providers?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                API 提供商
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h4" color="primary.main">
                {mappings?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                模型映射规则
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h4" color="primary.main">
                {mappings?.filter((m) => m.isEnabled).length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                启用的规则
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 快速配置 */}
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            <SettingsIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6">快速配置</Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  API 提供商管理
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  添加和管理您的 OpenAI、Azure、Ollama 等 API 服务提供商
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    {providers?.slice(0, 2).map((provider) => (
                      <Chip
                        key={provider.id}
                        label={provider.name}
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                        color={provider.isDefault ? "primary" : "default"}
                      />
                    ))}
                    {(providers?.length || 0) > 2 && (
                      <Chip label={`+${(providers?.length || 0) - 2} 更多`} size="small" sx={{ mb: 1 }} />
                    )}
                  </Box>
                  <Button component={RouterLink} to="/settings" variant="outlined" size="small">
                    管理
                  </Button>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  模型映射规则
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  配置模型名称到 API 提供商的智能路由规则
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    {mappings?.slice(0, 2).map((mapping) => (
                      <Chip
                        key={mapping.id}
                        label={`${mapping.keyword} → ${mapping.targetModel}`}
                        size="small"
                        sx={{ mr: 1, mb: 1 }}
                        color={mapping.isEnabled ? "success" : "default"}
                      />
                    ))}
                    {(mappings?.length || 0) > 2 && (
                      <Chip label={`+${(mappings?.length || 0) - 2} 更多`} size="small" sx={{ mb: 1 }} />
                    )}
                  </Box>
                  <Button component={RouterLink} to="/settings" variant="outlined" size="small">
                    配置
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ textAlign: "center" }}>
            <Button
              component={RouterLink}
              to="/settings"
              variant="contained"
              size="large"
              startIcon={<SettingsIcon />}
              sx={{ mr: 2 }}
            >
              进入设置
            </Button>
            <Button
              href="/docs/AI_PROXY_GUIDE.md"
              target="_blank"
              variant="outlined"
              size="large"
              startIcon={<LinkIcon />}
            >
              查看文档
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
