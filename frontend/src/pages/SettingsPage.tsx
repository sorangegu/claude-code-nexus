import React, { useState } from "react";
import { Box, Container, Typography, Tab, Tabs, Card, CardContent, Alert } from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import { ApiProvidersTab } from "../components/settings/ApiProvidersTab";
import { ModelMappingsTab } from "../components/settings/ModelMappingsTab";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    "aria-controls": `settings-tabpanel-${index}`,
  };
}

export function SettingsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
          请先登录以访问设置页面
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* 页面标题 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          设置
        </Typography>
        <Typography variant="body1" color="text.secondary">
          管理您的 API 提供商和模型映射规则，自定义 AI 代理服务的行为
        </Typography>
      </Box>

      {/* 设置标签页 */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="设置标签页">
            <Tab label="API 提供商" {...a11yProps(0)} />
            <Tab label="模型映射规则" {...a11yProps(1)} />
          </Tabs>
        </Box>

        <CardContent>
          <TabPanel value={tabValue} index={0}>
            <ApiProvidersTab />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <ModelMappingsTab />
          </TabPanel>
        </CardContent>
      </Card>
    </Container>
  );
}
