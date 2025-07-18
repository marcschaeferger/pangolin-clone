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
import { SignUpResponse } from "@server/routers/auth";
import { useRouter } from "next/navigation";
import { passwordSchema } from "@server/auth/passwordSchema";
import { AxiosResponse } from "axios";
import { formatAxiosError } from "@app/lib/api";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import Image from "next/image";
import { cleanRedirect } from "@app/lib/cleanRedirect";
import { useTranslations } from "next-intl";
import BrandingLogo from "@app/components/BrandingLogo";

type SignupFormProps = {
    redirect?: string;
    inviteId?: string;
    inviteToken?: string;
};

const formSchema = z
    .object({
        name: z.string().optional(),
        email: z.string().email({ message: "Invalid email address" }),
        password: passwordSchema,
        confirmPassword: passwordSchema
    })
    .refine((data) => data.password === data.confirmPassword, {
        path: ["confirmPassword"],
        message: "Passwords do not match"
    });

export default function SignupForm({
    redirect,
    inviteId,
    inviteToken
}: SignupFormProps) {
    const router = useRouter();

    const { env } = useEnvContext();

    const api = createApiClient({ env });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: ""
        }
    });

    const t = useTranslations();

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const { name, email, password } = values;

        setLoading(true);
        const res = await api
            .put<AxiosResponse<SignUpResponse>>("/auth/signup", {
                name,
                email,
                password,
                inviteId,
                inviteToken
            })
            .catch((e) => {
                console.error(e);
                setError(formatAxiosError(e, t("signupError")));
            });

        if (res && res.status === 200) {
            setError(null);

            if (res.data?.data?.emailVerificationRequired) {
                if (redirect) {
                    const safe = cleanRedirect(redirect);
                    router.push(`/auth/verify-email?redirect=${safe}`);
                } else {
                    router.push("/auth/verify-email");
                }
                return;
            }

            if (redirect) {
                const safe = cleanRedirect(redirect);
                router.push(safe);
            } else {
                router.push("/setup");
            }
        }

        setLoading(false);
    }

    function getSubtitle() {
        return t("authCreateAccount");
    }

    return (
        <Card className="w-full max-w-md shadow-md">
            <CardHeader className="border-b">
                <div className="flex flex-row items-center justify-center">
                    <BrandingLogo
                        height={58}
                        width={175}
                    />
                </div>
                <div className="text-center space-y-1 pt-3">
                    <p className="text-muted-foreground">{getSubtitle()}</p>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('name')}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("email")}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
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
                                    <FormLabel>{t("password")}</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} />
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
                                        {t("confirmPassword")}
                                    </FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} />
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

                        <Button type="submit" className="w-full">
                            {t("createAccount")}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
