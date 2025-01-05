"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot
} from "@/components/ui/input-otp";
import { AxiosResponse } from "axios";
import {
    RequestPasswordResetBody,
    RequestPasswordResetResponse,
    ResetPasswordBody,
    ResetPasswordResponse
} from "@server/routers/auth";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { useToast } from "@app/hooks/useToast";
import { useRouter } from "next/navigation";
import { formatAxiosError } from "@app/lib/api";;
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { passwordSchema } from "@server/auth/passwordSchema";

const requestSchema = z.object({
    email: z.string().email()
});

const formSchema = z
    .object({
        email: z.string().email({ message: "Invalid email address" }),
        token: z.string().min(8, { message: "Invalid token" }),
        password: passwordSchema,
        confirmPassword: passwordSchema
    })
    .refine((data) => data.password === data.confirmPassword, {
        path: ["confirmPassword"],
        message: "Passwords do not match"
    });

const mfaSchema = z.object({
    code: z.string().length(6, { message: "Invalid code" })
});

export type ResetPasswordFormProps = {
    emailParam?: string;
    tokenParam?: string;
    redirect?: string;
};

export default function ResetPasswordForm({
    emailParam,
    tokenParam,
    redirect
}: ResetPasswordFormProps) {
    const router = useRouter();

    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    function getState() {
        if (emailParam && !tokenParam) {
            return "request";
        }

        if (emailParam && tokenParam) {
            return "reset";
        }

        return "request";
    }

    const [state, setState] = useState<"request" | "reset" | "mfa">(getState());

    const { toast } = useToast();

    const api = createApiClient(useEnvContext());

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: emailParam || "",
            token: tokenParam || "",
            password: "",
            confirmPassword: ""
        }
    });

    const mfaForm = useForm<z.infer<typeof mfaSchema>>({
        resolver: zodResolver(mfaSchema),
        defaultValues: {
            code: ""
        }
    });

    const requestForm = useForm<z.infer<typeof requestSchema>>({
        resolver: zodResolver(requestSchema),
        defaultValues: {
            email: emailParam || ""
        }
    });

    async function onRequest(data: z.infer<typeof requestSchema>) {
        const { email } = data;

        setIsSubmitting(true);

        const res = await api
            .post<AxiosResponse<RequestPasswordResetResponse>>(
                "/auth/reset-password/request",
                {
                    email
                } as RequestPasswordResetBody
            )
            .catch((e) => {
                setError(formatAxiosError(e, "An error occurred"));
                console.error("Failed to request reset:", e);
                setIsSubmitting(false);
            });

        if (res && res.data?.data) {
            setError(null);
            setState("reset");
            setIsSubmitting(false);
            form.setValue("email", email);
        }
    }

    async function onReset(data: any) {
        setIsSubmitting(true);

        const { password, email, token } = form.getValues();
        const { code } = mfaForm.getValues();

        const res = await api
            .post<AxiosResponse<ResetPasswordResponse>>(
                "/auth/reset-password",
                {
                    email,
                    token,
                    newPassword: password,
                    code
                } as ResetPasswordBody
            )
            .catch((e) => {
                setError(formatAxiosError(e, "An error occurred"));
                console.error("Failed to reset password:", e);
                setIsSubmitting(false);
            });

        console.log(res);

        if (res) {
            setError(null);

            if (res.data.data?.codeRequested) {
                setState("mfa");
                setIsSubmitting(false);
                mfaForm.reset();
                return;
            }

            setSuccessMessage("Password reset successfully! Back to login...");

            setTimeout(() => {
                if (redirect && redirect.includes("http")) {
                    window.location.href = redirect;
                }
                if (redirect) {
                    router.push(redirect);
                } else {
                    router.push("/login");
                }
                setIsSubmitting(false);
            }, 1500);
        }
    }

    return (
        <div>
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Reset Password</CardTitle>
                    <CardDescription>
                        Follow the steps to reset your password
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {state === "request" && (
                            <Form {...requestForm}>
                                <form
                                    onSubmit={requestForm.handleSubmit(
                                        onRequest
                                    )}
                                    className="space-y-4"
                                    id="form"
                                >
                                    <FormField
                                        control={requestForm.control}
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
                                                <FormDescription>
                                                    We'll send a password reset
                                                    code to this email address.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </form>
                            </Form>
                        )}

                        {state === "reset" && (
                            <Form {...form}>
                                <form
                                    onSubmit={form.handleSubmit(onReset)}
                                    className="space-y-4"
                                    id="form"
                                >
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Email"
                                                        {...field}
                                                        disabled
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {!tokenParam && (
                                        <FormField
                                            control={form.control}
                                            name="token"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Reset Code
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Enter reset code sent to your email"
                                                            type="password"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    New Password
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="password"
                                                        placeholder="Password"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Confirm New Password
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="password"
                                                        placeholder="Confirm Password"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </form>
                            </Form>
                        )}

                        {state === "mfa" && (
                            <Form {...mfaForm}>
                                <form
                                    onSubmit={mfaForm.handleSubmit(onReset)}
                                    className="space-y-4"
                                    id="form"
                                >
                                    <FormField
                                        control={mfaForm.control}
                                        name="code"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Authenticator Code
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="flex justify-center">
                                                        <InputOTP
                                                            maxLength={6}
                                                            {...field}
                                                            pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                                                        >
                                                            <InputOTPGroup>
                                                                <InputOTPSlot
                                                                    index={0}
                                                                />
                                                                <InputOTPSlot
                                                                    index={1}
                                                                />
                                                                <InputOTPSlot
                                                                    index={2}
                                                                />
                                                                <InputOTPSlot
                                                                    index={3}
                                                                />
                                                                <InputOTPSlot
                                                                    index={4}
                                                                />
                                                                <InputOTPSlot
                                                                    index={5}
                                                                />
                                                            </InputOTPGroup>
                                                        </InputOTP>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </form>
                            </Form>
                        )}

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {successMessage && (
                            <Alert variant="success">
                                <AlertDescription>
                                    {successMessage}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-4">
                            {(state === "reset" || state === "mfa") && (
                                <Button
                                    type="submit"
                                    form="form"
                                    className="w-full"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    {state === "reset"
                                        ? "Reset Password"
                                        : "Submit Code"}
                                </Button>
                            )}

                            {state === "request" && (
                                <Button
                                    type="submit"
                                    form="form"
                                    className="w-full"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Request Reset
                                </Button>
                            )}

                            {state === "mfa" && (
                                <Button
                                    type="button"
                                    className="w-full"
                                    variant="outline"
                                    onClick={() => {
                                        setState("reset");
                                        mfaForm.reset();
                                    }}
                                >
                                    Back to Password
                                </Button>
                            )}

                            {(state === "mfa" || state === "reset") && (
                                <Button
                                    type="button"
                                    className="w-full"
                                    variant="outline"
                                    onClick={() => {
                                        setState("request");
                                        form.reset();
                                    }}
                                >
                                    Back to Email
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
