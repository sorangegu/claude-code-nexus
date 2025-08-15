import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";

// 类型定义
interface User {
  id: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  apiKey: string;
  createdAt: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    sessionToken: string;
  };
}

// API 函数
const authApi = {
  // 获取 GitHub OAuth 登录 URL
  getLoginUrl: async (): Promise<{ authUrl: string; state: string }> => {
    const response = await fetch("/api/auth/github");
    const data: any = await response.json();
    if (!data.success) {
      throw new Error(data.message);
    }
    return data.data;
  },

  // 获取当前用户信息
  getCurrentUser: async (): Promise<User> => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("No auth token found");
    }

    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("auth_token");
        throw new Error("Token expired");
      }
      throw new Error("Failed to fetch user");
    }

    return response.json();
  },

  // 登出
  logout: async (): Promise<void> => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      localStorage.removeItem("auth_token");
    }
  },
};

// 封装 fetch 并添加认证头
export const fetchWithAuth = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const token = localStorage.getItem("auth_token");
  const headers = new Headers(init?.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const newInit: RequestInit = {
    ...init,
    headers,
  };

  return fetch(input, newInit);
};

// 自定义 Hook
export function useAuth() {
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasToken, setHasToken] = useState(() => !!localStorage.getItem("auth_token"));

  // 查询当前用户
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: authApi.getCurrentUser,
    enabled: hasToken,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // 获取登录 URL
  const loginMutation = useMutation({
    mutationFn: authApi.getLoginUrl,
    onSuccess: (data) => {
      // 跳转到 GitHub 授权页面
      window.location.href = data.authUrl;
    },
  });

  // 登出
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      localStorage.removeItem("auth_token");
      setHasToken(false);
      queryClient.clear();
      window.location.href = "/";
    },
  });

  useEffect(() => {
    setHasToken(!!localStorage.getItem("auth_token"));
    setIsInitialized(true);
  }, []);

  // 登录函数
  const login = () => {
    loginMutation.mutate();
  };

  // 登出函数
  const logout = () => {
    logoutMutation.mutate();
  };

  // 检查是否已登录 - 使用 useMemo 稳定引用
  const isAuthenticated = useMemo(() => !!user && hasToken, [user, hasToken]);

  // 调试日志
  console.log("useAuth 状态:", {
    user: user ? `${user.username} (${user.id})` : null,
    hasToken,
    isAuthenticated,
    isLoading,
    isInitialized,
  });

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || !isInitialized,
    error,
    login,
    logout,
    refetch,
    isLoginLoading: loginMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
  };
}
