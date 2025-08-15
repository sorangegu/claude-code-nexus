import { Box, CircularProgress, Typography } from "@mui/material";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { AuthResponseSchema, UserInfoSchema } from "../../../common/validators/auth.schema";
import { useRef } from "react";
import { z } from "zod";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { refetch } = useAuth();
  const isProcessing = useRef(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (isProcessing.current) {
        return;
      }
      isProcessing.current = true;

      const params = new URLSearchParams(location.search);
      const code = params.get("code");
      const state = params.get("state");

      if (!code || !state) {
        navigate("/");
        return;
      }

      try {
        const response = await fetch(`/api/auth/github/callback?code=${code}&state=${state}`);
        const data: z.infer<typeof AuthResponseSchema> = await response.json();

        if (data.success && data.data) {
          localStorage.setItem("auth_token", data.data.sessionToken);
          queryClient.setQueryData<z.infer<typeof UserInfoSchema>>(["auth", "user"], data.data.user);
          await refetch();
          navigate("/dashboard");
        } else {
          console.error("Authentication failed:", data.message);
          navigate("/");
        }
      } catch (error) {
        console.error("Error during auth callback:", error);
        navigate("/");
      }
    };

    handleAuthCallback();
  }, [location, navigate, queryClient, refetch]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <CircularProgress />
      <Typography sx={{ mt: 2 }}>正在验证您的身份，请稍候...</Typography>
    </Box>
  );
}
