import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "./useEnvContext";
import { AxiosResponse } from "axios";
import { LoginResponse } from "@server/routers/auth";

export function useAuth() {
    const router = useRouter();
    const api = createApiClient(useEnvContext());

    const login = useCallback(async (email: string, password: string) => {
        return api.post<LoginResponse>("/auth/login", {
            email,
            password
        });
    }, [api]);

    const logout = useCallback(async () => {
        try {
            await api.post("/auth/logout");
            router.push("/auth/login");
        } catch (error) {
            console.error("Failed to logout:", error);
        }
    }, [api, router]);

    return {
        login,
        logout
    };
} 