import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  useTheme,
  Alert,
  Chip,
  Stack,
} from "@mui/material";
import {
  GitHub as GitHubIcon,
  Terminal as TerminalIcon,
  Api as ApiIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  CloudDone as CloudIcon,
  Code as CodeIcon,
} from "@mui/icons-material";
import { useAuth } from "@frontend/hooks/useAuth";

const HomePage = () => {
  const theme = useTheme();
  const { isAuthenticated, login } = useAuth();

  const features = [
    {
      icon: <ApiIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: "完整 Claude API 兼容",
      description: "100% 兼容 Claude Messages API，支持流式响应、工具使用和多模态输入",
    },
    {
      icon: <TerminalIcon sx={{ fontSize: 40, color: theme.palette.secondary.main }} />,
      title: "Claude Code CLI 直接支持",
      description: "无需修改代码，直接配置环境变量即可让 Claude Code 使用您的 API 服务",
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 40, color: theme.palette.success.main }} />,
      title: "实时请求转换",
      description: "高性能的请求/响应格式转换，支持流式输出，延迟最小化",
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 40, color: theme.palette.warning.main }} />,
      title: "安全加密存储",
      description: "API Key 加密存储，用户数据完全隔离，确保您的密钥安全",
    },
    {
      icon: <CloudIcon sx={{ fontSize: 40, color: theme.palette.info.main }} />,
      title: "Cloudflare 全球加速",
      description: "基于 Cloudflare 全球网络，低延迟高可用，无服务器架构零维护",
    },
    {
      icon: <CodeIcon sx={{ fontSize: 40, color: theme.palette.error.main }} />,
      title: "开源 & 可定制",
      description: "项目完全开源，您可以自行部署、修改和扩展，满足您的定制化需求",
    },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)`,
          py: { xs: 8, md: 12 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                variant="h2"
                component="h1"
                gutterBottom
                sx={{
                  fontWeight: "bold",
                  fontSize: { xs: "2.5rem", md: "3.5rem" },
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Claude Code Nexus
              </Typography>
              <Typography variant="h5" color="text.secondary" paragraph>
                让 Claude Code 兼容任意 OpenAI API
              </Typography>
              <Typography variant="body1" paragraph sx={{ mb: 4, fontSize: "1.1rem" }}>
                无缝代理转发，完美兼容 Claude API，支持 OneAPI、Azure OpenAI、本地 Ollama 等任何 OpenAI 兼容服务。
                一次配置，终身使用。
              </Typography>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<GitHubIcon />}
                  size="large"
                  href="https://github.com/KroMiose/claude-code-nexus"
                  sx={{ px: 4, py: 1.5 }}
                >
                  开源仓库
                </Button>
                {isAuthenticated ? (
                  <Button variant="contained" size="large" href="/dashboard" sx={{ px: 4, py: 1.5 }}>
                    进入控制台
                  </Button>
                ) : (
                  <Button variant="contained" size="large" onClick={login} sx={{ px: 4, py: 1.5 }}>
                    立即开始
                  </Button>
                )}
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 3,
                  bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                  position: "relative",
                }}
              >
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Box sx={{ width: 12, height: 12, bgcolor: "#ff5f56", borderRadius: "50%" }} />
                  <Box sx={{ width: 12, height: 12, bgcolor: "#ffbd2e", borderRadius: "50%" }} />
                  <Box sx={{ width: 12, height: 12, bgcolor: "#27ca3f", borderRadius: "50%" }} />
                </Stack>
                <Typography
                  variant="body2"
                  component="pre"
                  sx={{
                    fontFamily: "monospace",
                    color: theme.palette.text.primary,
                    lineHeight: 1.6,
                  }}
                >
                  {`
# 使用我们的代理
export ANTHROPIC_API_KEY="ak-your-nexus-key"
export ANTHROPIC_BASE_URL="https://claude.nekro.ai"

# 现在 Claude Code 会使用您的 API 服务！
claude`}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" align="center" gutterBottom sx={{ mb: 6, fontWeight: "bold" }}>
          为什么选择 Claude Code Nexus？
        </Typography>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card
                sx={{
                  height: "100%",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: theme.shadows[8],
                  },
                }}
              >
                <CardContent sx={{ p: 3, textAlign: "center" }}>
                  <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* How it Works */}
      <Box sx={{ bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50", py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" align="center" gutterBottom sx={{ mb: 6, fontWeight: "bold" }}>
            工作原理
          </Typography>

          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box sx={{ mb: 4 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <Chip label="1" color="primary" />
                  <Typography variant="h6">GitHub 登录注册</Typography>
                </Stack>
                <Typography variant="body1" color="text.secondary" sx={{ ml: 5 }}>
                  使用您的 GitHub 账号快速注册，获得专属的 API Key
                </Typography>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <Chip label="2" color="primary" />
                  <Typography variant="h6">配置您的 API 服务</Typography>
                </Stack>
                <Typography variant="body1" color="text.secondary" sx={{ ml: 5 }}>
                  在控制台中配置您的 OpenAI 兼容 API 服务（OneAPI、Azure、Ollama 等）
                </Typography>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <Chip label="3" color="primary" />
                  <Typography variant="h6">设置模型映射</Typography>
                </Stack>
                <Typography variant="body1" color="text.secondary" sx={{ ml: 5 }}>
                  配置 haiku、sonnet、opus 到您的具体模型的映射关系
                </Typography>
              </Box>

              <Box>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <Chip label="4" color="primary" />
                  <Typography variant="h6">开始使用</Typography>
                </Stack>
                <Typography variant="body1" color="text.secondary" sx={{ ml: 5 }}>
                  配置 Claude Code 使用我们的代理地址，享受无缝的 AI 编程体验
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  textAlign: "center",
                  p: 4,
                  bgcolor: "background.paper",
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography variant="h4" color="primary.main" sx={{ mb: 1, fontWeight: "bold" }}>
                  3 分钟
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  从注册到开始使用
                </Typography>
                <Box sx={{ mt: 3 }}>
                  <ApiIcon sx={{ fontSize: 80, color: theme.palette.primary.main, opacity: 0.3 }} />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: "bold" }}>
          立即开始使用
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 4 }}>
          让您的 Claude Code CLI 获得更多选择和可能性
        </Typography>

        {!isAuthenticated && (
          <Button
            variant="contained"
            size="large"
            startIcon={<GitHubIcon />}
            onClick={login}
            sx={{ px: 6, py: 2, fontSize: "1.1rem" }}
          >
            免费开始使用
          </Button>
        )}
      </Container>
    </Box>
  );
};

export default HomePage;
