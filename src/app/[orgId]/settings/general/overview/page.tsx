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

const GeneralFormSchema = z.object({
    name: z.string().min(1).max(255)
});

type GeneralFormValues = z.infer<typeof GeneralFormSchema>;

export default function GeneralSettingsPage() {
    const { org } = useOrgContext();
    const t = useTranslations();
    const api = createApiClient(useEnvContext());
    const [loadingSave, setLoadingSave] = useState(false);
    const [loadingDelete, setLoadingDelete] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const form = useForm<GeneralFormValues>({
        resolver: zodResolver(GeneralFormSchema),
        defaultValues: {
            name: org?.org.name || ""
        },
        mode: "onChange"
    });

    async function onSubmit(data: GeneralFormValues) {
        setLoadingSave(true);
        try {
            await api.put(`/org/${org?.org.orgId}`, data);
            
            toast({
                title: t('generalSettingsUpdated'),
                description: t('generalSettingsUpdatedDescription')
            });
        } catch (err) {
            toast({
                variant: "destructive",
                title: t('generalSettingsError'),
                description: formatAxiosError(err, t('generalSettingsErrorMessage'))
            });
        } finally {
            setLoadingSave(false);
        }
    }

    return (
        <SettingsContainer>
            <SettingsSection>
                <SettingsSectionHeader>
                    <SettingsSectionTitle>
                        {t('orgGeneralSettings')}
                    </SettingsSectionTitle>
                    <SettingsSectionDescription>
                        {t('orgGeneralSettingsDescription')}
                    </SettingsSectionDescription>
                </SettingsSectionHeader>

                <SettingsSectionBody>
                    <SettingsSectionForm>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4"
                                id="org-settings-form"
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
                                            <FormDescription>
                                                {t('orgDisplayName')}
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
                        form="org-settings-form"
                        loading={loadingSave}
                        disabled={loadingSave}
                    >
                        {t('saveGeneralSettings')}
                    </Button>
                </SettingsSectionFooter>
            </SettingsSection>

            <SettingsSection>
                <SettingsSectionHeader>
                    <SettingsSectionTitle>{t('orgDangerZone')}</SettingsSectionTitle>
                    <SettingsSectionDescription>
                        {t('orgDangerZoneDescription')}
                    </SettingsSectionDescription>
                </SettingsSectionHeader>

                <SettingsSectionFooter>
                    <Button
                        variant="destructive"
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="flex items-center gap-2"
                        loading={loadingDelete}
                        disabled={loadingDelete}
                    >
                        {t('orgDelete')}
                    </Button>
                </SettingsSectionFooter>
            </SettingsSection>
        </SettingsContainer>
    );
} 