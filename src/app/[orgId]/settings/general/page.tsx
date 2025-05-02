"use client";

import ConfirmDeleteDialog from "@app/components/ConfirmDeleteDialog";
import { Button } from "@app/components/ui/button";
import { useOrgContext } from "@app/hooks/useOrgContext";
import { userOrgUserContext } from "@app/hooks/useOrgUserContext";
import { toast } from "@app/hooks/useToast";
import { useState } from "react";
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
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { formatAxiosError } from "@app/lib/api";
import { AlertTriangle, Trash2 } from "lucide-react";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { AxiosResponse } from "axios";
import { DeleteOrgResponse, ListUserOrgsResponse } from "@server/routers/org";
import { redirect, useRouter } from "next/navigation";
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
import { useUserContext } from "@app/hooks/useUserContext";

const GeneralFormSchema = z.object({
    name: z.string()
});

type GeneralFormValues = z.infer<typeof GeneralFormSchema>;

export default function GeneralPage() {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const { orgUser } = userOrgUserContext();
    const router = useRouter();
    const { org } = useOrgContext();
    const api = createApiClient(useEnvContext());
    const { user } = useUserContext();

    const [loadingDelete, setLoadingDelete] = useState(false);
    const [loadingSave, setLoadingSave] = useState(false);

    const form = useForm<GeneralFormValues>({
        resolver: zodResolver(GeneralFormSchema),
        defaultValues: {
            name: org?.org.name
        },
        mode: "onChange"
    });

    async function deleteOrg() {
        setLoadingDelete(true);
        try {
            const res = await api.delete<AxiosResponse<DeleteOrgResponse>>(
                `/org/${org?.org.orgId}`
            );

            toast({
                title: "Organization deleted",
                description: "The organization and its data has been deleted."
            });

            if (res.status === 200) {
                pickNewOrgAndNavigate();
            }
        } catch (err) {
            console.error(err);
            toast({
                variant: "destructive",
                title: "Failed to delete org",
                description: formatAxiosError(
                    err,
                    "An error occurred while deleting the org."
                )
            });
        } finally {
            setLoadingDelete(false);
        }
    }

    async function pickNewOrgAndNavigate() {
        try {
            const res = await api.get<AxiosResponse<ListUserOrgsResponse>>(
                `/user/${user.userId}/orgs`
            );

            if (res.status === 200) {
                if (res.data.data.orgs.length > 0) {
                    const orgId = res.data.data.orgs[0].orgId;
                    // go to `/${orgId}/settings`);
                    router.push(`/${orgId}/settings`);
                } else {
                    // go to `/setup`
                    router.push("/setup");
                }
            }
        } catch (err) {
            console.error(err);
            toast({
                variant: "destructive",
                title: "Failed to fetch orgs",
                description: formatAxiosError(
                    err,
                    "An error occurred while listing your orgs"
                )
            });
        }
    }

    async function onSubmit(data: GeneralFormValues) {
        setLoadingSave(true);
        await api
            .post(`/org/${org?.org.orgId}`, {
                name: data.name
            })
            .then(() => {
                toast({
                    title: "Organization updated",
                    description: "The organization has been updated."
                });

                router.refresh();
            })
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Failed to update org",
                    description: formatAxiosError(
                        e,
                        "An error occurred while updating the org."
                    )
                });
            })
            .finally(() => {
                setLoadingSave(false);
            });
    }

    return (
        <SettingsContainer>
            <ConfirmDeleteDialog
                open={isDeleteModalOpen}
                setOpen={(val) => {
                    setIsDeleteModalOpen(val);
                }}
                dialog={
                    <div>
                        <p className="mb-2">
                            Are you sure you want to delete the organization{" "}
                            <b>{org?.org.name}?</b>
                        </p>
                        <p className="mb-2">
                            This action is irreversible and will delete all
                            associated data.
                        </p>
                        <p>
                            To confirm, type the name of the organization below.
                        </p>
                    </div>
                }
                buttonText="Confirm Delete Organization"
                onConfirm={deleteOrg}
                string={org?.org.name || ""}
                title="Delete Organization"
            />

            <SettingsSection>
                <SettingsSectionHeader>
                    <SettingsSectionTitle>
                        Organization Settings
                    </SettingsSectionTitle>
                    <SettingsSectionDescription>
                        Manage your organization details and configuration
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
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            <FormDescription>
                                                This is the display name of the
                                                organization.
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
                        Save General Settings
                    </Button>
                </SettingsSectionFooter>
            </SettingsSection>

            <SettingsSection>
                <SettingsSectionHeader>
                    <SettingsSectionTitle>Danger Zone</SettingsSectionTitle>
                    <SettingsSectionDescription>
                        Once you delete this org, there is no going back. Please
                        be certain.
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
                        Delete Organization Data
                    </Button>
                </SettingsSectionFooter>
            </SettingsSection>
        </SettingsContainer>
    );
}
