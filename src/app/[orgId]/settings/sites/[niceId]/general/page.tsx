"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { useSiteContext } from "@app/hooks/useSiteContext";
import { useForm } from "react-hook-form";
import { toast } from "@app/hooks/useToast";
import { useRouter } from "next/navigation";
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
import { useState } from "react";
import { SwitchInput } from "@app/components/SwitchInput";
import { useTranslations } from "next-intl";
import Link from "next/link";

const GeneralFormSchema = z.object({
    name: z.string().nonempty("Name is required"),
    dockerSocketEnabled: z.boolean().optional()
});

type GeneralFormValues = z.infer<typeof GeneralFormSchema>;

export default function GeneralPage() {
    const { site, updateSite } = useSiteContext();

    const api = createApiClient(useEnvContext());

    const [loading, setLoading] = useState(false);

    const router = useRouter();
    const t = useTranslations();

    const form = useForm<GeneralFormValues>({
        resolver: zodResolver(GeneralFormSchema),
        defaultValues: {
            name: site?.name,
            dockerSocketEnabled: site?.dockerSocketEnabled ?? false
        },
        mode: "onChange"
    });

    async function onSubmit(data: GeneralFormValues) {
        setLoading(true);

        await api
            .post(`/site/${site?.siteId}`, {
                name: data.name,
                dockerSocketEnabled: data.dockerSocketEnabled
            })
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: t("siteErrorUpdate"),
                    description: formatAxiosError(
                        e,
                        t("siteErrorUpdateDescription")
                    )
                });
            });

        updateSite({
            name: data.name,
            dockerSocketEnabled: data.dockerSocketEnabled
        });

        toast({
            title: t("siteUpdated"),
            description: t("siteUpdatedDescription")
        });

        setLoading(false);

        router.refresh();
    }

    return (
        <SettingsContainer>
            <SettingsSection>
                <SettingsSectionHeader>
                    <SettingsSectionTitle>
                        {t("generalSettings")}
                    </SettingsSectionTitle>
                    <SettingsSectionDescription>
                        {t("siteGeneralDescription")}
                    </SettingsSectionDescription>
                </SettingsSectionHeader>

                <SettingsSectionBody>
                    <SettingsSectionForm>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-6"
                                id="general-settings-form"
                            >
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("name")}</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            <FormDescription>
                                                {t("siteNameDescription")}
                                            </FormDescription>
                                        </FormItem>
                                    )}
                                />
                                {site && site.type === "newt" && (
                                    <FormField
                                        control={form.control}
                                        name="dockerSocketEnabled"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <SwitchInput
                                                        id="docker-socket-enabled"
                                                        label={t(
                                                            "enableDockerSocket"
                                                        )}
                                                        defaultChecked={
                                                            field.value
                                                        }
                                                        onCheckedChange={
                                                            field.onChange
                                                        }
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                                <FormDescription>
                                                    {t(
                                                        "enableDockerSocketDescription"
                                                    )}
                                                    <Link
                                                        href="https://docs.fossorial.io/Newt/overview#docker-socket-integration"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline inline-flex items-center"
                                                    >
                                                        <span>
                                                            {" "}
                                                            {t(
                                                                "enableDockerSocketLink"
                                                            )}
                                                        </span>
                                                    </Link>
                                                </FormDescription>
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </form>
                        </Form>
                    </SettingsSectionForm>
                </SettingsSectionBody>

                <SettingsSectionFooter>
                    <Button
                        type="submit"
                        form="general-settings-form"
                        loading={loading}
                        disabled={loading}
                    >
                        {t("saveGeneralSettings")}
                    </Button>
                </SettingsSectionFooter>
            </SettingsSection>
        </SettingsContainer>
    );
}
