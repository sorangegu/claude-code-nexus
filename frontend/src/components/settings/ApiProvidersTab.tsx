import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from "@mui/icons-material";
import {
  useApiProviders,
  useCreateApiProvider,
  useUpdateApiProvider,
  useDeleteApiProvider,
  type ApiProvider,
  type CreateApiProviderData,
  type UpdateApiProviderData,
} from "../../hooks/useConfig";

interface ProviderDialogProps {
  open: boolean;
  onClose: () => void;
  provider?: ApiProvider;
  onSubmit: (data: CreateApiProviderData | UpdateApiProviderData) => Promise<void>;
  loading: boolean;
}

function ProviderDialog({ open, onClose, provider, onSubmit, loading }: ProviderDialogProps) {
  const [formData, setFormData] = useState({
    name: provider?.name || "",
    baseUrl: provider?.baseUrl || "",
    apiKey: "",
    isDefault: provider?.isDefault || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleClose = () => {
    setFormData({
      name: "",
      baseUrl: "",
      apiKey: "",
      isDefault: false,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{provider ? "编辑 API 提供商" : "添加 API 提供商"}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="名称"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              sx={{ mb: 2 }}
              placeholder="例如：OpenAI 官方、Azure GPT-4o"
            />
            <TextField
              fullWidth
              label="Base URL"
              value={formData.baseUrl}
              onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
              required
              sx={{ mb: 2 }}
              placeholder="https://api.openai.com"
            />
            <TextField
              fullWidth
              label="API Key"
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              required={!provider}
              sx={{ mb: 2 }}
              placeholder={provider ? "留空表示不更改" : "sk-..."}
              helperText={provider ? "留空表示不更改现有 API Key" : ""}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                />
              }
              label="设为默认提供商"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>取消</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : provider ? "更新" : "添加"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export function ApiProvidersTab() {
  const { data: providers, isLoading, error } = useApiProviders();
  const createMutation = useCreateApiProvider();
  const updateMutation = useUpdateApiProvider();
  const deleteMutation = useDeleteApiProvider();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ApiProvider | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<ApiProvider | undefined>();

  const handleCreate = async (data: CreateApiProviderData) => {
    try {
      await createMutation.mutateAsync(data);
      setDialogOpen(false);
    } catch (error) {
      console.error("创建失败:", error);
    }
  };

  const handleUpdate = async (data: UpdateApiProviderData) => {
    if (!editingProvider) return;

    try {
      await updateMutation.mutateAsync({ id: editingProvider.id, data });
      setDialogOpen(false);
      setEditingProvider(undefined);
    } catch (error) {
      console.error("更新失败:", error);
    }
  };

  const handleDelete = async () => {
    if (!providerToDelete) return;

    try {
      await deleteMutation.mutateAsync(providerToDelete.id);
      setDeleteConfirmOpen(false);
      setProviderToDelete(undefined);
    } catch (error) {
      console.error("删除失败:", error);
    }
  };

  const openEditDialog = (provider: ApiProvider) => {
    setEditingProvider(provider);
    setDialogOpen(true);
  };

  const openDeleteConfirm = (provider: ApiProvider) => {
    setProviderToDelete(provider);
    setDeleteConfirmOpen(true);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        加载 API 提供商失败：{error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6">API 提供商管理</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          添加提供商
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        添加和管理您的 API 服务提供商。支持 OpenAI、Azure OpenAI、Ollama、OneAPI 等兼容 OpenAI 格式的服务。
      </Typography>

      {providers?.length === 0 ? (
        <Alert severity="info">您还没有配置任何 API 提供商。请点击"添加提供商"按钮开始配置。</Alert>
      ) : (
        <Grid container spacing={2}>
          {providers?.map((provider) => (
            <Grid item xs={12} md={6} key={provider.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                        <Typography variant="h6" sx={{ mr: 1 }}>
                          {provider.name}
                        </Typography>
                        {provider.isDefault && (
                          <Tooltip title="默认提供商">
                            <StarIcon color="warning" fontSize="small" />
                          </Tooltip>
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {provider.baseUrl}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        API Key: {provider.apiKeyMask}
                      </Typography>
                      <Chip
                        label={provider.isDefault ? "默认" : "备用"}
                        size="small"
                        color={provider.isDefault ? "warning" : "default"}
                      />
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={() => openEditDialog(provider)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => openDeleteConfirm(provider)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    创建时间：{new Date(provider.createdAt).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 添加/编辑对话框 */}
      <ProviderDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingProvider(undefined);
        }}
        provider={editingProvider}
        onSubmit={
          editingProvider
            ? (data) => handleUpdate(data as UpdateApiProviderData)
            : (data) => handleCreate(data as CreateApiProviderData)
        }
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* 删除确认对话框 */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除 API 提供商 "{providerToDelete?.name}" 吗？
            <br />
            <strong>注意：这将同时删除所有相关的模型映射规则。</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>取消</Button>
          <Button onClick={handleDelete} color="error" disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? <CircularProgress size={20} /> : "删除"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
