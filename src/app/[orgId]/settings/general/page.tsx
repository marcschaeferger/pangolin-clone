"use client";

import ConfirmDeleteDialog from "@app/components/ConfirmDeleteDialog";
import { Button } from "@app/components/ui/button";
import { useOrgContext } from "@app/hooks/useOrgContext";
import { userOrgUserContext } from "@app/hooks/useOrgUserContext";
import { useToast } from "@app/hooks/useToast";
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
import { formatAxiosError } from "@app/lib/api";;
import { AlertTriangle, Trash2 } from "lucide-react";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { AxiosResponse } from "axios";
import { DeleteOrgResponse, ListOrgsResponse } from "@server/routers/org";
import { redirect, useRouter } from "next/navigation";

const GeneralFormSchema = z.object({
    name: z.string()
});

type GeneralFormValues = z.infer<typeof GeneralFormSchema>;

export default function GeneralPage() {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const { orgUser } = userOrgUserContext();
    const router = useRouter();
    const { org } = useOrgContext();
    const { toast } = useToast();
    const api = createApiClient(useEnvContext());

    const form = useForm<GeneralFormValues>({
        resolver: zodResolver(GeneralFormSchema),
        defaultValues: {
            name: org?.org.name
        },
        mode: "onChange"
    });

    async function deleteOrg() {
        try {
            const res = await api.delete<AxiosResponse<DeleteOrgResponse>>(
                `/org/${org?.org.orgId}`
            );
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
        }
    }

    async function pickNewOrgAndNavigate() {
        try {

            const res = await api.get<AxiosResponse<ListOrgsResponse>>(
                `/orgs`
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
        await api
            .post(`/org/${org?.org.orgId}`, {
                name: data.name
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
            });
    }

    return (
        <>
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

            <section className="space-y-8 max-w-lg">
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
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        This is the display name of the org
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">Save Changes</Button>
                    </form>
                </Form>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Danger Zone
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">
                            Once you delete this org, there is no going back.
                            Please be certain.
                        </p>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button
                            variant="destructive"
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="flex items-center gap-2"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete Organization Data
                        </Button>
                    </CardFooter>
                </Card>
            </section>
        </>
    );
}
