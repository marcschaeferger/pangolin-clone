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
    FormMessage
} from "@/components/ui/form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoginResponse } from "@server/routers/auth";
import { useRouter } from "next/navigation";
import { AxiosResponse } from "axios";
import { formatAxiosError } from "@app/lib/utils";
import { LockIcon } from "lucide-react";
import { createApiClient } from "@app/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot
} from "./ui/input-otp";
import Link from "next/link";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";

type LoginFormProps = {
    redirect?: string;
    onLogin?: () => void;
};

const formSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z
        .string()
        .min(8, { message: "Password must be at least 8 characters" })
});

const mfaSchema = z.object({
    code: z.string().length(6, { message: "Invalid code" })
});

export default function LoginForm({ redirect, onLogin }: LoginFormProps) {
    const router = useRouter();

    const api = createApiClient(useEnvContext());

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [mfaRequested, setMfaRequested] = useState(true);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: ""
        }
    });

    const mfaForm = useForm<z.infer<typeof mfaSchema>>({
        resolver: zodResolver(mfaSchema),
        defaultValues: {
            code: ""
        }
    });

    async function onSubmit(values: any) {
        const { email, password } = form.getValues();
        const { code } = mfaForm.getValues();

        setLoading(true);

        const res = await api
            .post<AxiosResponse<LoginResponse>>("/auth/login", {
                email,
                password,
                code
            })
            .catch((e) => {
                console.error(e);
                setError(
                    formatAxiosError(e, "An error occurred while logging in")
                );
            });

        if (res) {
            setError(null);

            const data = res.data.data;

            console.log(data);

            if (data?.codeRequested) {
                setMfaRequested(true);
                setLoading(false);
                mfaForm.reset();
                return;
            }

            if (data?.emailVerificationRequired) {
                if (redirect) {
                    router.push(`/auth/verify-email?redirect=${redirect}`);
                } else {
                    router.push("/auth/verify-email");
                }
                return;
            }

            if (onLogin) {
                await onLogin();
            }
        }

        setLoading(false);
    }

    return (
        <div className="space-y-8">
            {!mfaRequested && (
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

                        <div className="space-y-4">
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

                            <div className="text-center">
                                <Link
                                    href={`/auth/reset-password${form.getValues().email ? `?email=${form.getValues().email}` : ""}`}
                                    className="text-sm text-muted-foreground"
                                >
                                    Forgot password? Click here
                                </Link>
                            </div>
                        </div>

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
                            <LockIcon className="w-4 h-4 mr-2" />
                            Login
                        </Button>
                    </form>
                </Form>
            )}

            {mfaRequested && (
                <Form {...mfaForm}>
                    <form
                        onSubmit={mfaForm.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        <FormField
                            control={mfaForm.control}
                            name="code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Authenticator Code</FormLabel>
                                    <FormControl>
                                        <div className="flex justify-center">
                                            <InputOTP maxLength={6} {...field} pattern={REGEXP_ONLY_DIGITS_AND_CHARS}>
                                                <InputOTPGroup>
                                                    <InputOTPSlot index={0} />
                                                    <InputOTPSlot index={1} />
                                                    <InputOTPSlot index={2} />
                                                </InputOTPGroup>
                                                <InputOTPSeparator />
                                                <InputOTPGroup>
                                                    <InputOTPSlot index={3} />
                                                    <InputOTPSlot index={4} />
                                                    <InputOTPSlot index={5} />
                                                </InputOTPGroup>
                                            </InputOTP>
                                        </div>
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

                        <div className="space-y-4">
                            <Button
                                type="submit"
                                className="w-full"
                                loading={loading}
                            >
                                <LockIcon className="w-4 h-4 mr-2" />
                                Submit Code
                            </Button>
                            <Button
                                type="button"
                                className="w-full"
                                variant="outline"
                                onClick={() => {
                                    setMfaRequested(false);
                                    mfaForm.reset();
                                }}
                            >
                                Back to Login
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
        </div>
    );
}
