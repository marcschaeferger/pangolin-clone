"use client";

import { useEffect, useState } from "react";
import api from "@app/api";
import { ListRolesResponse } from "@server/routers/role";
import { useToast } from "@app/hooks/useToast";
import { useOrgContext } from "@app/hooks/useOrgContext";
import { useResourceContext } from "@app/hooks/useResourceContext";
import { AxiosResponse } from "axios";
import { formatAxiosError } from "@app/lib/utils";
import {
    ListResourceRolesResponse,
    ListResourceUsersResponse,
} from "@server/routers/resource";
import { Button } from "@app/components/ui/button";
import { z } from "zod";
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
import { ListUsersResponse } from "@server/routers/user";
import { Switch } from "@app/components/ui/switch";
import { Label } from "@app/components/ui/label";

const UsersRolesFormSchema = z.object({
    roles: z.array(
        z.object({
            id: z.string(),
            text: z.string(),
        })
    ),
    users: z.array(
        z.object({
            id: z.string(),
            text: z.string(),
        })
    ),
});

export default function ResourceAuthenticationPage() {
    const { toast } = useToast();
    const { org } = useOrgContext();
    const { resource, updateResource } = useResourceContext();

    const [allRoles, setAllRoles] = useState<{ id: string; text: string }[]>(
        []
    );
    const [allUsers, setAllUsers] = useState<{ id: string; text: string }[]>(
        []
    );
    const [activeRolesTagIndex, setActiveRolesTagIndex] = useState<
        number | null
    >(null);
    const [activeUsersTagIndex, setActiveUsersTagIndex] = useState<
        number | null
    >(null);

    const [ssoEnabled, setSsoEnabled] = useState(resource.sso);
    const [blockAccess, setBlockAccess] = useState(resource.blockAccess);

    const [loadingSaveUsersRoles, setLoadingSaveUsersRoles] = useState(false);
    const [loadingSaveAuth, setLoadingSaveAuth] = useState(false);

    const usersRolesForm = useForm<z.infer<typeof UsersRolesFormSchema>>({
        resolver: zodResolver(UsersRolesFormSchema),
        defaultValues: { roles: [], users: [] },
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
                usersRolesForm.setValue(
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

        api.get<AxiosResponse<ListUsersResponse>>(
            `/org/${org?.org.orgId}/users`
        )
            .then((res) => {
                setAllUsers(
                    res.data.data.users.map((user) => ({
                        id: user.id.toString(),
                        text: user.email,
                    }))
                );
            })
            .catch((e) => {
                console.error(e);
                toast({
                    variant: "destructive",
                    title: "Failed to fetch users",
                    description: formatAxiosError(
                        e,
                        "An error occurred while fetching the users"
                    ),
                });
            });

        api.get<AxiosResponse<ListResourceUsersResponse>>(
            `/resource/${resource.resourceId}/users`
        )
            .then((res) => {
                usersRolesForm.setValue(
                    "users",
                    res.data.data.users.map((i) => ({
                        id: i.userId.toString(),
                        text: i.email,
                    }))
                );
            })
            .catch((e) => {
                console.error(e);
                toast({
                    variant: "destructive",
                    title: "Failed to fetch users",
                    description: formatAxiosError(
                        e,
                        "An error occurred while fetching the users"
                    ),
                });
            });
    }, []);

    async function onSubmitUsersRoles(
        data: z.infer<typeof UsersRolesFormSchema>
    ) {
        try {
            setLoadingSaveUsersRoles(true);
            await api.post(`/resource/${resource.resourceId}/roles`, {
                roleIds: data.roles.map((i) => parseInt(i.id)),
            });

            await api.post(`/resource/${resource.resourceId}/users`, {
                userIds: data.users.map((i) => i.id),
            });

            toast({
                title: "Saved successfully",
                description: "Authentication settings have been saved",
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
            setLoadingSaveUsersRoles(false);
        }
    }

    async function onSubmitAuth() {
        try {
            setLoadingSaveAuth(true);

            await api.post(`/resource/${resource.resourceId}`, {
                sso: ssoEnabled,
                blockAccess,
            });

            updateResource({
                blockAccess,
                sso: ssoEnabled,
            });

            toast({
                title: "Saved successfully",
                description: "Authentication settings have been saved",
            });
        } catch (e) {
            console.error(e);
            toast({
                variant: "destructive",
                title: "Failed to save authentication",
                description: formatAxiosError(
                    e,
                    "An error occurred while saving the authentication"
                ),
            });
        } finally {
            setLoadingSaveAuth(false);
        }
    }

    return (
        <>
            <div className="space-y-6 lg:max-w-2xl">
                <SettingsSectionTitle
                    title="Users & Roles"
                    description="Configure who can visit this resource (only applicable if SSO is used)"
                    size="1xl"
                />

                <Form {...usersRolesForm}>
                    <form
                        onSubmit={usersRolesForm.handleSubmit(
                            onSubmitUsersRoles
                        )}
                        className="space-y-6"
                    >
                        <FormField
                            control={usersRolesForm.control}
                            name="roles"
                            render={({ field }) => (
                                <FormItem className="flex flex-col items-start">
                                    <FormLabel>Roles</FormLabel>
                                    <FormControl>
                                        <TagInput
                                            {...field}
                                            activeTagIndex={activeRolesTagIndex}
                                            setActiveTagIndex={
                                                setActiveRolesTagIndex
                                            }
                                            placeholder="Enter a role"
                                            tags={
                                                usersRolesForm.getValues().roles
                                            }
                                            setTags={(newRoles) => {
                                                usersRolesForm.setValue(
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
                                                input: "border-none bg-transparent text-inherit placeholder:text-inherit shadow-none",
                                                inlineTagsContainer:
                                                    "bg-transparent",
                                            }}
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
                        <FormField
                            control={usersRolesForm.control}
                            name="users"
                            render={({ field }) => (
                                <FormItem className="flex flex-col items-start">
                                    <FormLabel>Users</FormLabel>
                                    <FormControl>
                                        <TagInput
                                            {...field}
                                            activeTagIndex={activeUsersTagIndex}
                                            setActiveTagIndex={
                                                setActiveUsersTagIndex
                                            }
                                            placeholder="Enter a user"
                                            tags={
                                                usersRolesForm.getValues().users
                                            }
                                            setTags={(newUsers) => {
                                                usersRolesForm.setValue(
                                                    "users",
                                                    newUsers as [Tag, ...Tag[]]
                                                );
                                            }}
                                            enableAutocomplete={true}
                                            autocompleteOptions={allUsers}
                                            allowDuplicates={false}
                                            restrictTagsToAutocompleteOptions={
                                                true
                                            }
                                            sortTags={true}
                                            styleClasses={{
                                                tag: {
                                                    body: "bg-muted hover:bg-accent text-foreground  p-2",
                                                },
                                                input: "border-none bg-transparent text-inherit placeholder:text-inherit shadow-none",
                                                inlineTagsContainer:
                                                    "bg-transparent",
                                            }}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Users added here will be able to access
                                        this resource. A user will always have
                                        access to a resource if they have a role
                                        that has access to it.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button
                            type="submit"
                            loading={loadingSaveUsersRoles}
                            disabled={loadingSaveUsersRoles}
                        >
                            Save Users & Roles
                        </Button>
                    </form>
                </Form>

                <SettingsSectionTitle
                    title="Authentication Methods"
                    description="Configure how users can authenticate to this resource"
                    size="1xl"
                />

                <div>
                    <div className="flex items-center space-x-2 mb-2">
                        <Switch
                            id="block-toggle"
                            defaultChecked={resource.blockAccess}
                            onCheckedChange={(val) => setBlockAccess(val)}
                        />
                        <Label htmlFor="block-toggle">Block Access</Label>
                    </div>
                    <span className="text-muted-foreground text-sm">
                        When enabled, all auth methods will be disabled and
                        users will not able to access the resource. This is an
                        override.
                    </span>
                </div>

                <div>
                    <div className="flex items-center space-x-2 mb-2">
                        <Switch
                            id="sso-toggle"
                            defaultChecked={resource.sso}
                            onCheckedChange={(val) => setSsoEnabled(val)}
                        />
                        <Label htmlFor="sso-toggle">Allow SSO</Label>
                    </div>
                    <span className="text-muted-foreground text-sm">
                        Users will be able to access the resource if they're
                        logged into the dashboard and have access to the
                        resource. Users will only have to login once for all
                        resources that have SSO enabled.
                    </span>
                </div>

                <Button
                    type="button"
                    onClick={onSubmitAuth}
                    loading={loadingSaveAuth}
                    disabled={loadingSaveAuth}
                >
                    Save Authentication
                </Button>
            </div>
        </>
    );
}
