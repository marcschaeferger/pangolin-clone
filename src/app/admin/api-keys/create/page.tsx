"use client";

import {
    SettingsContainer,
    SettingsSection,
    SettingsSectionBody,
    SettingsSectionDescription,
    SettingsSectionForm,
    SettingsSectionHeader,
    SettingsSectionTitle
} from "@app/components/Settings";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@app/components/ui/form";
import HeaderTitle from "@app/components/SettingsSectionTitle";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@app/components/ui/input";
import { InfoIcon } from "lucide-react";
import { Button } from "@app/components/ui/button";
import { Checkbox, CheckboxWithLabel } from "@app/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@app/components/ui/alert";
import { createApiClient, formatAxiosError } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { toast } from "@app/hooks/useToast";
import { AxiosResponse } from "axios";
import { useParams, useRouter } from "next/navigation";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@app/components/ui/breadcrumb";
import Link from "next/link";
import {
    CreateOrgApiKeyBody,
    CreateOrgApiKeyResponse
} from "@server/routers/apiKeys";
import {
    InfoSection,
    InfoSectionContent,
    InfoSections,
    InfoSectionTitle
} from "@app/components/InfoSection";
import CopyToClipboard from "@app/components/CopyToClipboard";
import moment from "moment";
import CopyTextBox from "@app/components/CopyTextBox";
import PermissionsSelectBox from "@app/components/PermissionsSelectBox";

const createFormSchema = z.object({
    name: z
        .string()
        .min(2, {
            message: "Name must be at least 2 characters."
        })
        .max(255, {
            message: "Name must not be longer than 255 characters."
        })
});

type CreateFormValues = z.infer<typeof createFormSchema>;

const copiedFormSchema = z
    .object({
        copied: z.boolean()
    })
    .refine(
        (data) => {
            return data.copied;
        },
        {
            message: "You must confirm that you have copied the API key.",
            path: ["copied"]
        }
    );

type CopiedFormValues = z.infer<typeof copiedFormSchema>;

export default function Page() {
    const { env } = useEnvContext();
    const api = createApiClient({ env });
    const router = useRouter();

    const [loadingPage, setLoadingPage] = useState(true);
    const [createLoading, setCreateLoading] = useState(false);
    const [apiKey, setApiKey] = useState<CreateOrgApiKeyResponse | null>(null);
    const [selectedPermissions, setSelectedPermissions] = useState<
        Record<string, boolean>
    >({});

    const form = useForm<CreateFormValues>({
        resolver: zodResolver(createFormSchema),
        defaultValues: {
            name: ""
        }
    });

    const copiedForm = useForm<CopiedFormValues>({
        resolver: zodResolver(copiedFormSchema),
        defaultValues: {
            copied: false
        }
    });

    async function onSubmit(data: CreateFormValues) {
        setCreateLoading(true);

        let payload: CreateOrgApiKeyBody = {
            name: data.name
        };

        const res = await api
            .put<AxiosResponse<CreateOrgApiKeyResponse>>(`/api-key`, payload)
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Error creating API key",
                    description: formatAxiosError(e)
                });
            });

        if (res && res.status === 201) {
            const data = res.data.data;

            console.log({
                actionIds: Object.keys(selectedPermissions).filter(
                    (key) => selectedPermissions[key]
                )
            });

            const actionsRes = await api
                .post(`/api-key/${data.apiKeyId}/actions`, {
                    actionIds: Object.keys(selectedPermissions).filter(
                        (key) => selectedPermissions[key]
                    )
                })
                .catch((e) => {
                    console.error("Error setting permissions", e);
                    toast({
                        variant: "destructive",
                        title: "Error setting permissions",
                        description: formatAxiosError(e)
                    });
                });

            if (actionsRes) {
                setApiKey(data);
            }
        }

        setCreateLoading(false);
    }

    async function onCopiedSubmit(data: CopiedFormValues) {
        if (!data.copied) {
            return;
        }

        router.push(`/admin/api-keys`);
    }

    useEffect(() => {
        const load = async () => {
            setLoadingPage(false);
        };

        load();
    }, []);

    return (
        <>
            <div className="flex justify-between">
                <HeaderTitle
                    title="Generate API Key"
                    description="Generate a new root access API key"
                />
                <Button
                    variant="outline"
                    onClick={() => {
                        router.push(`/admin/api-keys`);
                    }}
                >
                    See All API Keys
                </Button>
            </div>

            {!loadingPage && (
                <div>
                    <SettingsContainer>
                        {!apiKey && (
                            <>
                                <SettingsSection>
                                    <SettingsSectionHeader>
                                        <SettingsSectionTitle>
                                            API Key Information
                                        </SettingsSectionTitle>
                                    </SettingsSectionHeader>
                                    <SettingsSectionBody>
                                        <SettingsSectionForm>
                                            <Form {...form}>
                                                <form
                                                    className="space-y-4"
                                                    id="create-site-form"
                                                >
                                                    <FormField
                                                        control={form.control}
                                                        name="name"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Name
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        autoComplete="off"
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
                                </SettingsSection>

                                <SettingsSection>
                                    <SettingsSectionHeader>
                                        <SettingsSectionTitle>
                                            Permissions
                                        </SettingsSectionTitle>
                                        <SettingsSectionDescription>
                                            Determine what this API key can do
                                        </SettingsSectionDescription>
                                    </SettingsSectionHeader>
                                    <SettingsSectionBody>
                                        <PermissionsSelectBox
                                            root={true}
                                            selectedPermissions={
                                                selectedPermissions
                                            }
                                            onChange={setSelectedPermissions}
                                        />
                                    </SettingsSectionBody>
                                </SettingsSection>
                            </>
                        )}

                        {apiKey && (
                            <SettingsSection>
                                <SettingsSectionHeader>
                                    <SettingsSectionTitle>
                                        Your API Key
                                    </SettingsSectionTitle>
                                </SettingsSectionHeader>
                                <SettingsSectionBody>
                                    <InfoSections cols={2}>
                                        <InfoSection>
                                            <InfoSectionTitle>
                                                Name
                                            </InfoSectionTitle>
                                            <InfoSectionContent>
                                                <CopyToClipboard
                                                    text={apiKey.name}
                                                />
                                            </InfoSectionContent>
                                        </InfoSection>
                                        <InfoSection>
                                            <InfoSectionTitle>
                                                Created
                                            </InfoSectionTitle>
                                            <InfoSectionContent>
                                                {moment(
                                                    apiKey.createdAt
                                                ).format("lll")}
                                            </InfoSectionContent>
                                        </InfoSection>
                                    </InfoSections>

                                    <Alert variant="neutral">
                                        <InfoIcon className="h-4 w-4" />
                                        <AlertTitle className="font-semibold">
                                            Save Your API Key
                                        </AlertTitle>
                                        <AlertDescription>
                                            You will only be able to see this
                                            once. Make sure to copy it to a
                                            secure place.
                                        </AlertDescription>
                                    </Alert>

                                    <h4 className="font-semibold">
                                        Your API key is:
                                    </h4>

                                    <CopyTextBox
                                        text={`${apiKey.apiKeyId}.${apiKey.apiKey}`}
                                    />

                                    <Form {...copiedForm}>
                                        <form
                                            className="space-y-4"
                                            id="copied-form"
                                        >
                                            <FormField
                                                control={copiedForm.control}
                                                name="copied"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id="terms"
                                                                defaultChecked={
                                                                    copiedForm.getValues(
                                                                        "copied"
                                                                    ) as boolean
                                                                }
                                                                onCheckedChange={(
                                                                    e
                                                                ) => {
                                                                    copiedForm.setValue(
                                                                        "copied",
                                                                        e as boolean
                                                                    );
                                                                }}
                                                            />
                                                            <label
                                                                htmlFor="terms"
                                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                            >
                                                                I have copied
                                                                the API key
                                                            </label>
                                                        </div>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </form>
                                    </Form>
                                </SettingsSectionBody>
                            </SettingsSection>
                        )}
                    </SettingsContainer>

                    <div className="flex justify-end space-x-2 mt-8">
                        {!apiKey && (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={createLoading || apiKey !== null}
                                onClick={() => {
                                    router.push(`/admin/api-keys`);
                                }}
                            >
                                Cancel
                            </Button>
                        )}
                        {!apiKey && (
                            <Button
                                type="button"
                                loading={createLoading}
                                disabled={createLoading || apiKey !== null}
                                onClick={() => {
                                    form.handleSubmit(onSubmit)();
                                }}
                            >
                                Generate
                            </Button>
                        )}

                        {apiKey && (
                            <Button
                                type="button"
                                onClick={() => {
                                    copiedForm.handleSubmit(onCopiedSubmit)();
                                }}
                            >
                                Done
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
