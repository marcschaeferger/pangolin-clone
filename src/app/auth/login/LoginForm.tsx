"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoginResponse } from "@server/routers/auth";
import { api } from "@app/api";
import { useRouter } from "next/navigation";
import { AxiosResponse } from "axios";
import { formatAxiosError } from "@app/lib/utils";

type LoginFormProps = {
    redirect?: string;
};

const formSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z
        .string()
        .min(8, { message: "Password must be at least 8 characters" }),
});

export default function LoginForm({ redirect }: LoginFormProps) {
    const router = useRouter();

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const { email, password } = values;

        setLoading(true);

        const res = await api
            .post<AxiosResponse<LoginResponse>>("/auth/login", {
                email,
                password,
            })
            .catch((e) => {
                console.error(e);
                setError(
                    formatAxiosError(e, "An error occurred while logging in")
                );
            });

        if (res && res.status === 200) {
            setError(null);

            if (res.data?.data?.emailVerificationRequired) {
                if (redirect) {
                    router.push(`/auth/verify-email?redirect=${redirect}`);
                } else {
                    router.push("/auth/verify-email");
                }
                return;
            }

            if (redirect && redirect.includes("http")) {
                window.location.href = redirect;
            } else if (redirect) {
                router.push(redirect);
            } else {
                router.push("/");
            }
        }

        setLoading(false);
    }

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>
                    Enter your credentials to access your dashboard
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter your email"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
                                            placeholder="Enter your password"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <Button
                            type="submit"
                            className="w-full"
                            loading={loading}
                        >
                            Login
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
