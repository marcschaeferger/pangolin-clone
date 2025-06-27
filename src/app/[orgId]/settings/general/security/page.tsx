"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@app/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@app/components/ui/form";
import { Input } from "@app/components/ui/input";
import { useOrgContext } from "@app/hooks/useOrgContext";
import { useForm } from "react-hook-form";
import { toast } from "@app/hooks/useToast";
import { useState } from "react";
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
import { useTranslations } from 'next-intl';

const SecurityFormSchema = z.object({
    passwordResetTokenExpiryHours: z.coerce.number().min(1).max(24)
});

type SecurityFormValues = z.infer<typeof SecurityFormSchema>;

export default function SecuritySettingsPage() {
    const { org } = useOrgContext();
    const t = useTranslations();
    const api = createApiClient(useEnvContext());
    const [loadingSave, setLoadingSave] = useState(false);

    const form = useForm<SecurityFormValues>({
        resolver: zodResolver(SecurityFormSchema),
        defaultValues: {
            passwordResetTokenExpiryHours: org?.org.passwordResetTokenExpiryHours || 1
        },
        mode: "onChange"
    });

    async function onSubmit(data: SecurityFormValues) {
        setLoadingSave(true);
        try {
            await api.put(`/org/${org?.org.orgId}/security`, {
                passwordResetTokenExpiryHours: data.passwordResetTokenExpiryHours
            });
            
            toast({
                title: t('securitySettingsUpdated'),
                description: t('securitySettingsUpdatedDescription')
            });
        } catch (err) {
            toast({
                variant: "destructive",
                title: t('securitySettingsError'),
                description: formatAxiosError(err, t('securitySettingsErrorMessage'))
            });
        } finally {
            setLoadingSave(false);
        }
    }

    return (
        <SettingsContainer>
            {/* Security Settings Content */}
            <SettingsSection>
                <SettingsSectionHeader>
                    <SettingsSectionTitle>{t('tokenExpiration')}</SettingsSectionTitle>
                    <SettingsSectionDescription>
                        {t('tokenExpirationDescription')}
                    </SettingsSectionDescription>
                </SettingsSectionHeader>

                <SettingsSectionBody>
                    <SettingsSectionForm>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4"
                                id="security-settings-form"
                            >
                                <FormField
                                    control={form.control}
                                    name="passwordResetTokenExpiryHours"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('passwordResetExpireLimit')}</FormLabel>
                                            <FormControl>
                                                <div className="flex items-center space-x-2">
                                                    <Input 
                                                        type="number" 
                                                        min="1" 
                                                        max="24" 
                                                        className="w-24" 
                                                        {...field} 
                                                    />
                                                    <span className="text-sm text-muted-foreground">
                                                        {t('hours')}
                                                    </span>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                            <FormDescription>
                                                {t('passwordResetExpireLimitDescription')}
                                            </FormDescription>
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
                        form="security-settings-form"
                        loading={loadingSave}
                        disabled={loadingSave}
                    >
                        {t('saveSecuritySettings')}
                    </Button>
                </SettingsSectionFooter>
            </SettingsSection>
        </SettingsContainer>
    );
} 