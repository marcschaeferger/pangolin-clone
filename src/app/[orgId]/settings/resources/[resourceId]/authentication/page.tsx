"use client";

import { useEffect, useState } from "react";
import api from "@app/api";
import { ListRolesResponse } from "@server/routers/role";
import { useToast } from "@app/hooks/useToast";
import { useOrgContext } from "@app/hooks/useOrgContext";
import { useResourceContext } from "@app/hooks/useResourceContext";
import { AxiosResponse } from "axios";
import { formatAxiosError } from "@app/lib/utils";
import { ListResourceRolesResponse } from "@server/routers/resource";
import { Button } from "@app/components/ui/button";
import { set, z } from "zod";
import { Tag } from "emblor";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@app/components/ui/form";
import { TagInput } from "emblor";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";

const FormSchema = z.object({
    roles: z.array(
        z.object({
            id: z.string(),
            text: z.string(),
        })
    ),
});

export default function ResourceAuthenticationPage() {
    const { toast } = useToast();
    const { org } = useOrgContext();
    const { resource } = useResourceContext();

    const [allRoles, setAllRoles] = useState<{ id: string; text: string }[]>(
        []
    );
    const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);

    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: { roles: [] },
    });

    useEffect(() => {
        api.get<AxiosResponse<ListRolesResponse>>(
            `/org/${org?.org.orgId}/roles`
        )
            .then((res) => {
                setAllRoles(
                    res.data.data.roles
                        .map((role) => ({
                            id: role.roleId.toString(),
                            text: role.name,
                        }))
                        .filter((role) => role.text !== "Admin")
                );
            })
            .catch((e) => {
                console.error(e);
                toast({
                    variant: "destructive",
                    title: "Failed to fetch roles",
                    description: formatAxiosError(
                        e,
                        "An error occurred while fetching the roles"
                    ),
                });
            });

        api.get<AxiosResponse<ListResourceRolesResponse>>(
            `/resource/${resource.resourceId}/roles`
        )
            .then((res) => {
                form.setValue(
                    "roles",
                    res.data.data.roles
                        .map((i) => ({
                            id: i.roleId.toString(),
                            text: i.name,
                        }))
                        .filter((role) => role.text !== "Admin")
                );
            })
            .catch((e) => {
                console.error(e);
                toast({
                    variant: "destructive",
                    title: "Failed to fetch roles",
                    description: formatAxiosError(
                        e,
                        "An error occurred while fetching the roles"
                    ),
                });
            });
    }, []);

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        try {
            setLoading(true);
            await api.post(`/resource/${resource.resourceId}/roles`, {
                roleIds: data.roles.map((i) => parseInt(i.id)),
            });

            toast({
                title: "Roles set",
                description: "Roles set for resource successfully",
            });
        } catch (e) {
            console.error(e);
            toast({
                variant: "destructive",
                title: "Failed to set roles",
                description: formatAxiosError(
                    e,
                    "An error occurred while setting the roles"
                ),
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className="space-y-6 lg:max-w-2xl">
                <SettingsSectionTitle
                    title="Users & Roles"
                    description="Configure who can visit this resource"
                    size="1xl"
                />

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6"
                    >
                        <FormField
                            control={form.control}
                            name="roles"
                            render={({ field }) => (
                                <FormItem className="flex flex-col items-start">
                                    <FormLabel>Roles</FormLabel>
                                    <FormControl>
                                        <TagInput
                                            {...field}
                                            activeTagIndex={activeTagIndex}
                                            setActiveTagIndex={setActiveTagIndex}
                                            placeholder="Enter a role"
                                            tags={form.getValues().roles}
                                            setTags={(newRoles) => {
                                                form.setValue(
                                                    "roles",
                                                    newRoles as [Tag, ...Tag[]]
                                                );
                                            }}
                                            enableAutocomplete={true}
                                            autocompleteOptions={allRoles}
                                            allowDuplicates={false}
                                            restrictTagsToAutocompleteOptions={
                                                true
                                            }
                                            sortTags={true}
                                            styleClasses={{
                                                tag: {
                                                    body: "bg-muted hover:bg-accent text-foreground  p-2",
                                                },
                                                input: "border-none bg-transparent text-inherit placeholder:text-inherit shadow-none"
                                            }}
                                            inputFieldPosition={"top"}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Users with these roles will be able to
                                        access this resource. Admins can always
                                        access this resource.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button
                            type="submit"
                            loading={loading}
                            disabled={loading}
                        >
                            Save Changes
                        </Button>
                    </form>
                </Form>
            </div>
        </>
    );
}
