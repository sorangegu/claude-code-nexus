import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";

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

// 自定义 Hook
export function useAuth() {
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);

  // 查询当前用户
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: authApi.getCurrentUser,
    enabled: !!localStorage.getItem("auth_token"),
    retry: false,
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
      queryClient.clear();
      window.location.href = "/";
    },
  });

  // 处理 OAuth 回调
  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      const response = await fetch(`/api/auth/github/callback?code=${code}&state=${state}`);
      const data: AuthResponse = await response.json();

      if (data.success && data.data) {
        localStorage.setItem("auth_token", data.data.sessionToken);
        queryClient.setQueryData(["auth", "user"], data.data.user);
        return data.data.user;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error("OAuth callback error:", error);
      throw error;
    }
  };

  // 检查 URL 中的 OAuth 回调参数
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");

    if (code && state && !isInitialized) {
      setIsInitialized(true);
      handleOAuthCallback(code, state)
        .then(() => {
          // 清除 URL 参数
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((error) => {
          console.error("OAuth处理失败:", error);
          // 可以显示错误通知
        });
    } else if (!isInitialized) {
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // 登录函数
  const login = () => {
    loginMutation.mutate();
  };

  // 登出函数
  const logout = () => {
    logoutMutation.mutate();
  };

  // 检查是否已登录
  const isAuthenticated = !!user && !!localStorage.getItem("auth_token");

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
