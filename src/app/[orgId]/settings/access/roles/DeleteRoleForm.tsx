"use client";

import { Button } from "@app/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@app/components/ui/form";
import { toast } from "@app/hooks/useToast";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosResponse } from "axios";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
    Credenza,
    CredenzaBody,
    CredenzaClose,
    CredenzaContent,
    CredenzaDescription,
    CredenzaFooter,
    CredenzaHeader,
    CredenzaTitle
} from "@app/components/Credenza";
import { useOrgContext } from "@app/hooks/useOrgContext";
import { ListRolesResponse } from "@server/routers/role";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@app/components/ui/select";
import { RoleRow } from "./RolesTable";
import { formatAxiosError } from "@app/lib/api";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";

type CreateRoleFormProps = {
    open: boolean;
    roleToDelete: RoleRow;
    setOpen: (open: boolean) => void;
    afterDelete?: () => void;
};

const formSchema = z.object({
    newRoleId: z.string({ message: "New role is required" })
});

export default function DeleteRoleForm({
    open,
    roleToDelete,
    setOpen,
    afterDelete
}: CreateRoleFormProps) {
    const { org } = useOrgContext();

    const [loading, setLoading] = useState(false);
    const [roles, setRoles] = useState<ListRolesResponse["roles"]>([]);

    const api = createApiClient(useEnvContext());

    useEffect(() => {
        async function fetchRoles() {
            const res = await api
                .get<
                    AxiosResponse<ListRolesResponse>
                >(`/org/${org?.org.orgId}/roles`)
                .catch((e) => {
                    console.error(e);
                    toast({
                        variant: "destructive",
                        title: "Failed to fetch roles",
                        description: formatAxiosError(
                            e,
                            "An error occurred while fetching the roles"
                        )
                    });
                });

            if (res?.status === 200) {
                setRoles(
                    res.data.data.roles.filter(
                        (r) => r.roleId !== roleToDelete.roleId
                    )
                );
            }
        }

        fetchRoles();
    }, []);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            newRoleId: ""
        }
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);

        const res = await api
            .delete(`/role/${roleToDelete.roleId}`, {
                data: {
                    roleId: values.newRoleId
                }
            })
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Failed to remove role",
                    description: formatAxiosError(
                        e,
                        "An error occurred while removing the role."
                    )
                });
            });

        if (res && res.status === 200) {
            toast({
                variant: "default",
                title: "Role removed",
                description: "The role has been successfully removed."
            });

            if (open) {
                setOpen(false);
            }

            if (afterDelete) {
                afterDelete();
            }
        }

        setLoading(false);
    }

    return (
        <>
            <Credenza
                open={open}
                onOpenChange={(val) => {
                    setOpen(val);
                    setLoading(false);
                    form.reset();
                }}
            >
                <CredenzaContent>
                    <CredenzaHeader>
                        <CredenzaTitle>Remove Role</CredenzaTitle>
                        <CredenzaDescription>
                            Remove a role from the organization
                        </CredenzaDescription>
                    </CredenzaHeader>
                    <CredenzaBody>
                        <div className="space-y-4">
                            <div className="space-y-4">
                                <p>
                                    You're about to delete the{" "}
                                    <b>{roleToDelete.name}</b> role. You cannot
                                    undo this action.
                                </p>
                                <p>
                                    Before deleting this role, please select a
                                    new role to transfer existing members to.
                                </p>
                            </div>
                            <Form {...form}>
                                <form
                                    onSubmit={form.handleSubmit(onSubmit)}
                                    className="space-y-4"
                                    id="remove-role-form"
                                >
                                    <FormField
                                        control={form.control}
                                        name="newRoleId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Role</FormLabel>
                                                <Select
                                                    onValueChange={
                                                        field.onChange
                                                    }
                                                    value={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select role" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {roles.map((role) => (
                                                            <SelectItem
                                                                key={
                                                                    role.roleId
                                                                }
                                                                value={role.roleId.toString()}
                                                            >
                                                                {role.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </form>
                            </Form>
                        </div>
                    </CredenzaBody>
                    <CredenzaFooter>
                        <CredenzaClose asChild>
                            <Button variant="outline">Close</Button>
                        </CredenzaClose>
                        <Button
                            type="submit"
                            form="remove-role-form"
                            loading={loading}
                            disabled={loading}
                        >
                            Remove Role
                        </Button>
                    </CredenzaFooter>
                </CredenzaContent>
            </Credenza>
        </>
    );
}
