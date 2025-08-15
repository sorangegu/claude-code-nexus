import { Box, Button, Container, Typography, useTheme, Chip } from "@mui/material";
import { GitHub, Dashboard, Settings } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";

export const HeroSection = () => {
  const theme = useTheme();
  const { isAuthenticated } = useAuth();

  return (
    <Box
      component={motion.section}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      sx={{
        minHeight: "90vh",
        display: "flex",
        alignItems: "center",
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.pageBackground} 100%)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: "absolute",
          top: "10%",
          right: "10%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: `linear-gradient(45deg, ${theme.palette.primary.main}20, ${theme.palette.secondary.main}20)`,
          filter: "blur(60px)",
          animation: "float 6s ease-in-out infinite",
          "@keyframes float": {
            "0%, 100%": { transform: "translateY(0px)" },
            "50%": { transform: "translateY(-20px)" },
          },
        }}
      />

      <Container maxWidth="lg">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, marginBottom: 3 }}>
            <Typography
              variant="h1"
              component="h1"
              sx={{
                fontSize: { xs: "2.5rem", md: "4rem", lg: "5rem" },
                fontWeight: "bold",
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Claude Code Nexus
            </Typography>
            <Chip
              label="AI Proxy"
              size="small"
              sx={{
                fontSize: { xs: "0.75rem", md: "0.875rem" },
                height: { xs: "24px", md: "32px" },
                background: `linear-gradient(135deg, ${theme.palette.primary.main}20, ${theme.palette.secondary.main}20)`,
                border: `1px solid ${theme.palette.primary.main}40`,
                color: theme.palette.primary.main,
                fontWeight: "bold",
                alignSelf: "flex-start",
                marginTop: { xs: "0.5rem", md: "1rem" },
              }}
            />
          </Box>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          <Typography
            variant="h4"
            component="h2"
            sx={{
              color: theme.palette.text.primary,
              marginBottom: 2,
              textAlign: "center",
              fontWeight: 400,
            }}
          >
            AI 代理服务平台
          </Typography>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          <Typography
            variant="h6"
            sx={{
              color: theme.palette.text.secondary,
              marginBottom: 6,
              textAlign: "center",
              maxWidth: "800px",
              mx: "auto",
              lineHeight: 1.6,
            }}
          >
            让 Claude Code CLI 无缝调用任何 OpenAI 兼容的 LLM 服务。 支持 OpenAI、Azure、Ollama、OneAPI
            等多种后端，提供智能路由和统一管理
          </Typography>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          <Box sx={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap" }}>
            {isAuthenticated ? (
              <>
                <Button
                  component={RouterLink}
                  to="/dashboard"
                  variant="contained"
                  size="large"
                  startIcon={<Dashboard />}
                  sx={{
                    px: 6,
                    py: 2,
                    fontSize: "1.1rem",
                    borderRadius: "50px",
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    "&:hover": {
                      background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                      transform: "translateY(-2px)",
                      boxShadow: `0 8px 25px ${theme.palette.primary.main}40`,
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  进入仪表盘
                </Button>
                <Button
                  component={RouterLink}
                  to="/settings"
                  variant="outlined"
                  size="large"
                  startIcon={<Settings />}
                  sx={{
                    px: 6,
                    py: 2,
                    fontSize: "1.1rem",
                    borderRadius: "50px",
                    borderColor: theme.palette.primary.main,
                    color: theme.palette.primary.main,
                    "&:hover": {
                      borderColor: theme.palette.primary.dark,
                      backgroundColor: `${theme.palette.primary.main}10`,
                      transform: "translateY(-2px)",
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  管理配置
                </Button>
              </>
            ) : (
              <>
                <Button
                  component={RouterLink}
                  to="/features"
                  variant="contained"
                  size="large"
                  sx={{
                    px: 6,
                    py: 2,
                    fontSize: "1.1rem",
                    borderRadius: "50px",
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    "&:hover": {
                      background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                      transform: "translateY(-2px)",
                      boxShadow: `0 8px 25px ${theme.palette.primary.main}40`,
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  了解功能
                </Button>
                <Button
                  href="/docs/AI_PROXY_GUIDE.md"
                  target="_blank"
                  variant="outlined"
                  size="large"
                  sx={{
                    px: 6,
                    py: 2,
                    fontSize: "1.1rem",
                    borderRadius: "50px",
                    borderColor: theme.palette.primary.main,
                    color: theme.palette.primary.main,
                    "&:hover": {
                      borderColor: theme.palette.primary.dark,
                      backgroundColor: `${theme.palette.primary.main}10`,
                      transform: "translateY(-2px)",
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  查看文档
                </Button>
              </>
            )}
            <Button
              href="https://github.com/your-org/claude-code-nexus"
              target="_blank"
              variant="text"
              size="large"
              startIcon={<GitHub />}
              sx={{
                px: 4,
                py: 2,
                fontSize: "1.1rem",
                borderRadius: "50px",
                color: theme.palette.text.secondary,
                "&:hover": {
                  backgroundColor: `${theme.palette.primary.main}05`,
                  transform: "translateY(-2px)",
                },
                transition: "all 0.3s ease",
              }}
            >
              GitHub
            </Button>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};
