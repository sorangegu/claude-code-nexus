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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  SwapVert as SwapVertIcon,
} from "@mui/icons-material";
import {
  useModelMappings,
  useCreateModelMapping,
  useUpdateModelMapping,
  useDeleteModelMapping,
  useBatchUpdateMappings,
  useApiProviders,
  type ModelMapping,
  type CreateModelMappingData,
  type UpdateModelMappingData,
} from "../../hooks/useConfig";

interface MappingDialogProps {
  open: boolean;
  onClose: () => void;
  mapping?: ModelMapping;
  onSubmit: (data: CreateModelMappingData | UpdateModelMappingData) => Promise<void>;
  loading: boolean;
}

function MappingDialog({ open, onClose, mapping, onSubmit, loading }: MappingDialogProps) {
  const { data: providers } = useApiProviders();

  const [formData, setFormData] = useState({
    keyword: mapping?.keyword || "",
    providerId: mapping?.providerId || "",
    targetModel: mapping?.targetModel || "",
    priority: mapping?.priority || 0,
    isEnabled: mapping?.isEnabled ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleClose = () => {
    setFormData({
      keyword: "",
      providerId: "",
      targetModel: "",
      priority: 0,
      isEnabled: true,
    });
    onClose();
  };

  const commonKeywords = [
    { value: "haiku", label: "haiku (Claude 3 Haiku)" },
    { value: "sonnet", label: "sonnet (Claude 3.5 Sonnet)" },
    { value: "opus", label: "opus (Claude 3 Opus)" },
    { value: "gpt-4", label: "gpt-4" },
    { value: "gpt-3.5", label: "gpt-3.5" },
  ];

  const commonModels = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo",
    "claude-3-5-sonnet-20240620",
    "claude-3-haiku-20240307",
    "claude-3-opus-20240229",
  ];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{mapping ? "编辑映射规则" : "添加映射规则"}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="匹配关键词"
              value={formData.keyword}
              onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
              required
              sx={{ mb: 2 }}
              placeholder="例如：haiku, sonnet, opus"
              helperText="当请求的模型名称包含此关键词时，将应用此规则"
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>API 提供商</InputLabel>
              <Select
                value={formData.providerId}
                onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                required
              >
                {providers?.map((provider) => (
                  <MenuItem key={provider.id} value={provider.id}>
                    {provider.name}
                    {provider.isDefault && " (默认)"}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="目标模型"
              value={formData.targetModel}
              onChange={(e) => setFormData({ ...formData, targetModel: e.target.value })}
              required
              sx={{ mb: 2 }}
              placeholder="例如：gpt-4o, gpt-4o-mini"
              helperText="转发到 API 提供商时使用的模型名称"
            />

            <TextField
              fullWidth
              type="number"
              label="优先级"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              sx={{ mb: 2 }}
              helperText="数字越小优先级越高，0 为最高优先级"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isEnabled}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                />
              }
              label="启用此规则"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>取消</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : mapping ? "更新" : "添加"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export function ModelMappingsTab() {
  const { data: mappings, isLoading, error } = useModelMappings();
  const { data: providers } = useApiProviders();
  const createMutation = useCreateModelMapping();
  const updateMutation = useUpdateModelMapping();
  const deleteMutation = useDeleteModelMapping();
  const batchUpdateMutation = useBatchUpdateMappings();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<ModelMapping | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [mappingToDelete, setMappingToDelete] = useState<ModelMapping | undefined>();

  const handleCreate = async (data: CreateModelMappingData) => {
    try {
      await createMutation.mutateAsync(data);
      setDialogOpen(false);
    } catch (error) {
      console.error("创建失败:", error);
    }
  };

  const handleUpdate = async (data: UpdateModelMappingData) => {
    if (!editingMapping) return;

    try {
      await updateMutation.mutateAsync({ id: editingMapping.id, data });
      setDialogOpen(false);
      setEditingMapping(undefined);
    } catch (error) {
      console.error("更新失败:", error);
    }
  };

  const handleDelete = async () => {
    if (!mappingToDelete) return;

    try {
      await deleteMutation.mutateAsync(mappingToDelete.id);
      setDeleteConfirmOpen(false);
      setMappingToDelete(undefined);
    } catch (error) {
      console.error("删除失败:", error);
    }
  };

  const handleToggleEnabled = async (mapping: ModelMapping) => {
    try {
      await updateMutation.mutateAsync({
        id: mapping.id,
        data: { isEnabled: !mapping.isEnabled },
      });
    } catch (error) {
      console.error("更新失败:", error);
    }
  };

  const openEditDialog = (mapping: ModelMapping) => {
    setEditingMapping(mapping);
    setDialogOpen(true);
  };

  const openDeleteConfirm = (mapping: ModelMapping) => {
    setMappingToDelete(mapping);
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
        加载模型映射规则失败：{error.message}
      </Alert>
    );
  }

  if (!providers || providers.length === 0) {
    return (
      <Alert severity="warning" sx={{ mb: 3 }}>
        请先配置至少一个 API 提供商，然后才能创建模型映射规则。
      </Alert>
    );
  }

  const sortedMappings = mappings?.sort((a, b) => a.priority - b.priority) || [];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6">模型映射规则管理</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          添加规则
        </Button>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        配置模型名称到 API 提供商的映射规则。规则按优先级顺序匹配，数字越小优先级越高。
      </Typography>

      {/* 规则说明 */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          工作原理：
        </Typography>
        <Typography variant="body2">
          当 Claude Code 发送请求时，系统会检查模型名称是否包含任何规则的关键词。
          <br />
          例如：请求模型 "claude-3-5-sonnet-20240620" 包含关键词 "sonnet"，将匹配相应规则。
        </Typography>
      </Alert>

      {sortedMappings.length === 0 ? (
        <Alert severity="info">您还没有配置任何模型映射规则。请点击"添加规则"按钮开始配置。</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>优先级</TableCell>
                <TableCell>关键词</TableCell>
                <TableCell>API 提供商</TableCell>
                <TableCell>目标模型</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedMappings.map((mapping, index) => (
                <TableRow key={mapping.id}>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <DragIcon sx={{ mr: 1, color: "text.secondary" }} />
                      <Typography variant="body2">{mapping.priority}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={mapping.keyword} size="small" color="primary" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{mapping.providerName}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                      {mapping.targetModel}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={mapping.isEnabled ? "启用" : "禁用"}
                      size="small"
                      color={mapping.isEnabled ? "success" : "default"}
                      onClick={() => handleToggleEnabled(mapping)}
                      sx={{ cursor: "pointer" }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => openEditDialog(mapping)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => openDeleteConfirm(mapping)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 示例配置 */}
      {sortedMappings.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            当前配置示例
          </Typography>
          <Paper sx={{ p: 2, backgroundColor: "grey.50" }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              根据当前规则，以下是一些请求示例：
            </Typography>
            {sortedMappings
              .filter((m) => m.isEnabled)
              .slice(0, 3)
              .map((mapping) => (
                <Typography key={mapping.id} variant="body2" sx={{ fontFamily: "monospace", mb: 1 }}>
                  claude-3-{mapping.keyword}-* → {mapping.providerName} ({mapping.targetModel})
                </Typography>
              ))}
          </Paper>
        </Box>
      )}

      {/* 添加/编辑对话框 */}
      <MappingDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingMapping(undefined);
        }}
        mapping={editingMapping}
        onSubmit={
          editingMapping
            ? (data) => handleUpdate(data as UpdateModelMappingData)
            : (data) => handleCreate(data as CreateModelMappingData)
        }
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* 删除确认对话框 */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>确定要删除映射规则 "{mappingToDelete?.keyword}" 吗？</Typography>
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
