"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { createApiClient } from "@app/api";
import LoginForm from "@app/components/LoginForm";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type DashboardLoginFormProps = {
    redirect?: string;
};

export default function DashboardLoginForm({
    redirect
}: DashboardLoginFormProps) {
    const router = useRouter();
    // const api = createApiClient(useEnvContext());
    //
    // useEffect(() => {
    //     const logout = async () => {
    //         try {
    //             await api.post("/auth/logout");
    //             console.log("user logged out");
    //         } catch (e) {}
    //     };
    //
    //     logout();
    // });

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>
                    Enter your credentials to access your dashboard
                </CardDescription>
            </CardHeader>
            <CardContent>
                <LoginForm
                    redirect={redirect}
                    onLogin={() => {
                        if (redirect && redirect.includes("http")) {
                            window.location.href = redirect;
                        } else if (redirect) {
                            router.push(redirect);
                        } else {
                            router.push("/");
                        }
                    }}
                />
            </CardContent>
        </Card>
    );
}
