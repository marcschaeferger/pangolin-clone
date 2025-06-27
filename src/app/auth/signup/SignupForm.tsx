"use client";

import { useState, useEffect } from "react";
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
import { GetInviteDetailsResponse } from "@server/routers/user/getInviteDetails";

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

    const api = createApiClient(useEnvContext());

    const [loading, setLoading] = useState(false);
    const [loadingInviteDetails, setLoadingInviteDetails] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inviteEmail, setInviteEmail] = useState<string | null>(null);

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

    // Fetch invite details if coming from an invite link
    useEffect(() => {
        if (inviteId && inviteToken) {
            setLoadingInviteDetails(true);
            api.get<AxiosResponse<GetInviteDetailsResponse>>(`/invite/${inviteId}/${inviteToken}/details`)
                .then((res) => {
                    if (res.status === 200) {
                        const email = res.data.data.email;
                        setInviteEmail(email);
                        form.setValue("email", email);
                    }
                })
                .catch((e) => {
                    console.error("Failed to fetch invite details:", e);
                    // Don't show error for invite details, just continue with normal signup
                })
                .finally(() => {
                    setLoadingInviteDetails(false);
                });
        }
    }, [inviteId, inviteToken, api, form]);

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
                setError(
                    formatAxiosError(e, t('signupError'))
                );
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

    const isFromInvite = !!(inviteId && inviteToken);

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <div className="flex flex-row items-center justify-center">
                    <Image
                        src={`/logo/pangolin_orange.svg`}
                        alt={t('pangolinLogoAlt')}
                        width="100"
                        height="100"
                    />
                </div>
                <div className="text-center space-y-1">
                    <h1 className="text-2xl font-bold mt-1">
                        {t('welcome')}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {t('authCreateAccount')}
                    </p>
                </div>
            </CardHeader>
            <CardContent>
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
                                    <FormLabel>{t('email')}</FormLabel>
                                    <FormControl>
                                        <Input 
                                            {...field} 
                                            readOnly={isFromInvite}
                                            disabled={loadingInviteDetails}
                                            className={isFromInvite ? "bg-muted" : ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    {isFromInvite && inviteEmail && (
                                        <p className="text-sm text-muted-foreground">
                                            {t('inviteEmailPreFilled')}
                                        </p>
                                    )}
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('password')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
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
                                    <FormLabel>{t('confirmPassword')}</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="password"
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
                            disabled={loading || loadingInviteDetails}
                        >
                            {loading ? t('creatingAccount') : t('createAccount')}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
