"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@app/hooks/useToast";
import { useTranslations } from "next-intl";
import { createApiClient, formatAxiosError } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import {
    SettingsContainer,
    SettingsSection,
    SettingsSectionHeader
} from "@app/components/Settings";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";
import { Button } from "@app/components/ui/button";
import { Input } from "@app/components/ui/input";
import { Textarea } from "@app/components/ui/textarea";
import { Save } from "lucide-react";

const updateTemplateSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional()
});

type UpdateTemplateForm = z.infer<typeof updateTemplateSchema>;

export default function GeneralPage() {
    const params = useParams();
    const t = useTranslations();
    const api = createApiClient(useEnvContext());
    const [template, setTemplate] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors }
    } = useForm<UpdateTemplateForm>({
        resolver: zodResolver(updateTemplateSchema)
    });

    useEffect(() => {
        const fetchTemplate = async () => {
            if (!params.orgId || !params.templateId) return;

            try {
                const response = await api.get(
                    `/org/${params.orgId}/rule-templates/${params.templateId}`
                );
                setTemplate(response.data.data);
                setValue("name", response.data.data.name);
                setValue("description", response.data.data.description || "");
            } catch (error) {
                toast({
                    title: t("ruleTemplateErrorLoad"),
                    description: formatAxiosError(error, t("ruleTemplateErrorLoadDescription")),
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchTemplate();
    }, [params.orgId, params.templateId, setValue, t]);

    const onSubmit = async (data: UpdateTemplateForm) => {
        if (!params.orgId || !params.templateId) return;

        setSaving(true);
        try {
            await api.put(
                `/org/${params.orgId}/rule-templates/${params.templateId}`,
                data
            );
            toast({
                title: "Template Updated",
                description: "Template details have been updated successfully. Changes to template rules will automatically propagate to all assigned resources.",
                variant: "default"
            });
        } catch (error) {
            toast({
                title: t("ruleTemplateErrorUpdate"),
                description: formatAxiosError(error, t("ruleTemplateErrorUpdateDescription")),
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SettingsContainer>
                <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground">Loading...</div>
                </div>
            </SettingsContainer>
        );
    }

    if (!template) {
        return (
            <SettingsContainer>
                <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground">Template not found</div>
                </div>
            </SettingsContainer>
        );
    }

    return (
        <SettingsContainer>
            <SettingsSection>
                <SettingsSectionHeader>
                    <SettingsSectionTitle title={t("templateDetails")} />
                </SettingsSectionHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium mb-2">
                            {t("name")}
                        </label>
                        <Input
                            id="name"
                            {...register("name")}
                            className={errors.name ? "border-red-500" : ""}
                        />
                        {errors.name && (
                            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium mb-2">
                            {t("description")}
                        </label>
                        <Textarea
                            id="description"
                            {...register("description")}
                            rows={3}
                        />
                    </div>
                    <Button type="submit" disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? t("saving") : t("save")}
                    </Button>
                </form>
            </SettingsSection>
        </SettingsContainer>
    );
}
