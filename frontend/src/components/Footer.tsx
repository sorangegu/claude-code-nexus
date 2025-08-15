import { Box, Container, Link, Typography, Divider } from "@mui/material";

export const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 4,
        px: 2,
        mt: "auto",
        backgroundColor: "rgba(0,0,0,0.1)",
      }}
    >
      <Container maxWidth="lg">
        <Divider sx={{ mb: 4 }} />
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Claude Code Nexus. 为开发者提供最佳的 Claude API 代理服务.
          </Typography>
          <Box sx={{ display: "flex", gap: 3 }}>
            <Link
              href="https://github.com/KroMiose/claude-code-nexus"
              target="_blank"
              rel="noopener"
              variant="body2"
              color="text.secondary"
            >
              GitHub
            </Link>
            <Link href="https://cloudflare.com" target="_blank" rel="noopener" variant="body2" color="text.secondary">
              Powered by Cloudflare
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};
