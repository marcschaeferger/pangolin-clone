"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import LoginForm from "@app/components/LoginForm";
import { useRouter } from "next/navigation";

type DashboardLoginFormProps = {
    redirect?: string;
};

export default function DashboardLoginForm({
    redirect,
}: DashboardLoginFormProps) {
    const router = useRouter();

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
