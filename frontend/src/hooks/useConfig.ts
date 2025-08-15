import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// 类型定义
interface ApiProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyMask: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ModelMapping {
  id: string;
  keyword: string;
  providerId: string;
  providerName: string;
  targetModel: string;
  priority: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateApiProviderData {
  name: string;
  baseUrl: string;
  apiKey: string;
  isDefault?: boolean;
}

interface UpdateApiProviderData {
  name?: string;
  baseUrl?: string;
  apiKey?: string;
  isDefault?: boolean;
}

interface CreateModelMappingData {
  keyword: string;
  providerId: string;
  targetModel: string;
  priority?: number;
  isEnabled?: boolean;
}

interface UpdateModelMappingData {
  keyword?: string;
  providerId?: string;
  targetModel?: string;
  priority?: number;
  isEnabled?: boolean;
}

interface BatchUpdateMappingsData {
  mappings: Array<{
    id: string;
    priority: number;
  }>;
}

// API 函数
const getAuthHeaders = () => {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const configApi = {
  // API 提供商相关
  getProviders: async (): Promise<ApiProvider[]> => {
    const response = await fetch("/api/config/providers", {
      headers: getAuthHeaders(),
    });
    const data: any = await response.json();
    if (!data.success) {
      throw new Error(data.message);
    }
    return data.data;
  },

  createProvider: async (providerData: CreateApiProviderData): Promise<void> => {
    const response = await fetch("/api/config/providers", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(providerData),
    });
    const data: any = await response.json();
    if (!data.success) {
      throw new Error(data.message);
    }
  },

  updateProvider: async (id: string, providerData: UpdateApiProviderData): Promise<void> => {
    const response = await fetch(`/api/config/providers/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(providerData),
    });
    const data: any = await response.json();
    if (!data.success) {
      throw new Error(data.message);
    }
  },

  deleteProvider: async (id: string): Promise<void> => {
    const response = await fetch(`/api/config/providers/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data: any = await response.json();
    if (!data.success) {
      throw new Error(data.message);
    }
  },

  // 模型映射相关
  getMappings: async (): Promise<ModelMapping[]> => {
    const response = await fetch("/api/config/mappings", {
      headers: getAuthHeaders(),
    });
    const data: any = await response.json();
    if (!data.success) {
      throw new Error(data.message);
    }
    return data.data;
  },

  createMapping: async (mappingData: CreateModelMappingData): Promise<void> => {
    const response = await fetch("/api/config/mappings", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(mappingData),
    });
    const data: any = await response.json();
    if (!data.success) {
      throw new Error(data.message);
    }
  },

  updateMapping: async (id: string, mappingData: UpdateModelMappingData): Promise<void> => {
    const response = await fetch(`/api/config/mappings/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(mappingData),
    });
    const data: any = await response.json();
    if (!data.success) {
      throw new Error(data.message);
    }
  },

  deleteMapping: async (id: string): Promise<void> => {
    const response = await fetch(`/api/config/mappings/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data: any = await response.json();
    if (!data.success) {
      throw new Error(data.message);
    }
  },

  batchUpdateMappings: async (data: BatchUpdateMappingsData): Promise<void> => {
    const response = await fetch("/api/config/mappings/batch-priority", {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result: any = await response.json();
    if (!result.success) {
      throw new Error(result.message);
    }
  },
};

// API 提供商 Hooks
export function useApiProviders() {
  return useQuery({
    queryKey: ["config", "providers"],
    queryFn: configApi.getProviders,
  });
}

export function useCreateApiProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: configApi.createProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "providers"] });
    },
  });
}

export function useUpdateApiProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateApiProviderData }) => configApi.updateProvider(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "providers"] });
    },
  });
}

export function useDeleteApiProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: configApi.deleteProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "providers"] });
      queryClient.invalidateQueries({ queryKey: ["config", "mappings"] });
    },
  });
}

// 模型映射 Hooks
export function useModelMappings() {
  return useQuery({
    queryKey: ["config", "mappings"],
    queryFn: configApi.getMappings,
  });
}

export function useCreateModelMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: configApi.createMapping,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "mappings"] });
    },
  });
}

export function useUpdateModelMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateModelMappingData }) => configApi.updateMapping(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "mappings"] });
    },
  });
}

export function useDeleteModelMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: configApi.deleteMapping,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "mappings"] });
    },
  });
}

export function useBatchUpdateMappings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: configApi.batchUpdateMappings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "mappings"] });
    },
  });
}

// 导出类型
export type {
  ApiProvider,
  ModelMapping,
  CreateApiProviderData,
  UpdateApiProviderData,
  CreateModelMappingData,
  UpdateModelMappingData,
  BatchUpdateMappingsData,
};
