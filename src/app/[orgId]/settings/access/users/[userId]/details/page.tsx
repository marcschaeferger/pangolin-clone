"use client";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@app/components/ui/form";
import { Input } from "@app/components/ui/input";
import { toast } from "@app/hooks/useToast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@app/components/ui/button";
import {
    SettingsContainer,
    SettingsSection,
    SettingsSectionHeader,
    SettingsSectionTitle,
    SettingsSectionDescription,
    SettingsSectionBody,
    SettingsSectionForm,
    SettingsSectionFooter
} from "@app/components/Settings";
import { formatAxiosError } from "@app/lib/api";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { useTranslations } from "next-intl";
import { userOrgUserContext } from "@app/hooks/useOrgUserContext";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Mail, InfoIcon, Copy, Link } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@app/components/ui/alert";
import { Separator } from "@app/components/ui/separator";

export default function UserDetailsPage() {
    const { orgUser: user } = userOrgUserContext();
    const api = createApiClient(useEnvContext());
    const { env } = useEnvContext();
    const { orgId } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetLink, setResetLink] = useState<string | null>(null);
    const t = useTranslations();

    const formSchema = z.object({
        name: z.string().min(1, { message: t('nameRequired') }).max(255),
        email: z.string().email({ message: t('emailInvalid') })
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: user?.name || "",
            email: user?.email || ""
        }
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);

        try {
            const res = await api.post(`/org/${orgId}/user/${user?.userId}`, {
                name: values.name,
                email: values.email
            });

            if (res.status === 200) {
                toast({
                    variant: "default",
                    title: t('userUpdated'),
                    description: t('userUpdatedDescription')
                });
                router.refresh();
            }
        } catch (e) {
            toast({
                variant: "destructive",
                title: t('userErrorUpdate'),
                description: formatAxiosError(
                    e,
                    t('userErrorUpdateDescription')
                )
            });
        } finally {
            setLoading(false);
        }
    }

    async function onResetPassword() {
        setResetLoading(true);

        try {
            const res = await api.post(`/org/${orgId}/user/${user?.userId}/reset-password`, {
                sendEmail: env.email.emailEnabled
            });

            if (res.status === 200) {
                const responseData = res.data.data;
                
                if (env.email.emailEnabled) {
                    toast({
                        variant: "default",
                        title: t('passwordResetSent'),
                        description: t('passwordResetSentDescription', { email: user?.email || "" })
                    });
                    setResetLink(null);
                } else {
                    // Show the manual reset link when SMTP is not configured
                    setResetLink(responseData.resetLink);
                    toast({
                        variant: "default",
                        title: t('passwordReset'),
                        description: "Password reset link generated successfully"
                    });
                }
            }
        } catch (e) {
            toast({
                variant: "destructive",
                title: t('passwordResetError'),
                description: formatAxiosError(
                    e,
                    t('passwordResetErrorDescription')
                )
            });
        } finally {
            setResetLoading(false);
        }
    }

    async function copyToClipboard(text: string) {
        try {
            await navigator.clipboard.writeText(text);
            toast({
                variant: "default",
                title: "Copied!",
                description: "Reset link copied to clipboard"
            });
        } catch (e) {
            toast({
                variant: "destructive",
                title: "Copy failed",
                description: "Failed to copy to clipboard. Please copy manually."
            });
        }
    }

    const isExternalUser = user?.type !== "internal";

    return (
        <SettingsContainer>
            <SettingsSection>
                <SettingsSectionHeader>
                    <SettingsSectionTitle>
                        {t('userDetailsTitle')}
                    </SettingsSectionTitle>
                    <SettingsSectionDescription>
                        {t('userDetailsDescription')}
                    </SettingsSectionDescription>
                </SettingsSectionHeader>
                <SettingsSectionBody>
                    <SettingsSectionForm>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('name')}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder={t('namePlaceholder')}
                                                    {...field}
                                                />
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
                                                    type="email"
                                                    placeholder={t('emailPlaceholder')}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </form>
                        </Form>
                    </SettingsSectionForm>
                </SettingsSectionBody>
                <SettingsSectionFooter>
                    <Button
                        type="submit"
                        disabled={loading}
                        onClick={form.handleSubmit(onSubmit)}
                    >
                        {loading ? t('saving') : t('saveChanges')}
                    </Button>
                </SettingsSectionFooter>
            </SettingsSection>

            <Separator className="my-6" />

            <SettingsSection>
                <SettingsSectionHeader>
                    <SettingsSectionTitle>
                        {t('passwordReset')}
                    </SettingsSectionTitle>
                    <SettingsSectionDescription>
                        {t('passwordResetAdminDescription')}
                    </SettingsSectionDescription>
                </SettingsSectionHeader>
                <SettingsSectionBody>
                    {!env.email.emailEnabled && (
                        <Alert variant="neutral" className="mb-4">
                            <InfoIcon className="h-4 w-4" />
                            <AlertTitle className="font-semibold">
                                {t('otpEmailSmtpRequired')}
                            </AlertTitle>
                            <AlertDescription>
                                When SMTP is not configured, you'll receive a manual reset link to share with the user.
                            </AlertDescription>
                        </Alert>
                    )}
                    {isExternalUser ? (
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>{t('passwordResetUnavailable')}</AlertTitle>
                            <AlertDescription>
                                {t('passwordResetExternalUserDescription')}
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                {env.email.emailEnabled 
                                    ? t('passwordResetAdminInstructions')
                                    : "Click the button below to generate a password reset link that you can manually share with the user."
                                }
                            </p>
                            
                            {resetLink && (
                                <Alert className="border-green-200 bg-green-50">
                                    <Link className="h-4 w-4 text-green-600" />
                                    <AlertTitle className="text-green-800">Reset Link Generated</AlertTitle>
                                    <AlertDescription className="text-green-700">
                                        <div className="mt-2 space-y-2">
                                            <p className="text-sm">Share this link with the user to reset their password:</p>
                                            <div className="flex items-center gap-2 p-2 bg-white border rounded border-green-200">
                                                <code className="flex-1 text-xs break-all">{resetLink}</code>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => copyToClipboard(resetLink)}
                                                    className="shrink-0"
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            <p className="text-xs text-green-600">
                                                This link will expire in 1 hour.
                                            </p>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}
                </SettingsSectionBody>
                <SettingsSectionFooter>
                    <Button
                        variant="outline"
                        disabled={resetLoading || isExternalUser}
                        onClick={onResetPassword}
                        className="flex items-center gap-2"
                    >
                        {env.email.emailEnabled ? (
                            <Mail className="h-4 w-4" />
                        ) : (
                            <Link className="h-4 w-4" />
                        )}
                        {resetLoading 
                            ? t('passwordResetSending') 
                            : env.email.emailEnabled 
                                ? t('passwordResetSendEmail')
                                : "Generate Reset Link"
                        }
                    </Button>
                </SettingsSectionFooter>
            </SettingsSection>
        </SettingsContainer>
    );
} 