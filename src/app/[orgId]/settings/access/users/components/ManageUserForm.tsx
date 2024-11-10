"use client";

import api from "@app/api";
import { Button } from "@app/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@app/components/ui/form";
import { Input } from "@app/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@app/components/ui/select";
import { useToast } from "@app/hooks/useToast";
import { zodResolver } from "@hookform/resolvers/zod";
import { InviteUserResponse, ListUsersResponse } from "@server/routers/user";
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
    CredenzaTitle,
} from "@app/components/Credenza";
import { useOrgContext } from "@app/hooks/useOrgContext";
import { ListRolesResponse } from "@server/routers/role";
import { ArrayElement } from "@server/types/ArrayElement";

type ManageUserFormProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
    user: ArrayElement<ListUsersResponse["users"]>;
    onUserUpdate(): (
        user: ArrayElement<ListUsersResponse["users"]>
    ) => Promise<void>;
};

const formSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email" }),
    roleId: z.string().min(1, { message: "Please select a role" }),
});

export default function ManageUserForm({
    open,
    setOpen,
    user,
}: ManageUserFormProps) {
    const { toast } = useToast();
    const { org } = useOrgContext();

    const [loading, setLoading] = useState(false);
    const [roles, setRoles] = useState<{ roleId: number; name: string }[]>([]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: user.email,
            roleId: user.roleId?.toString(),
        },
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        async function fetchRoles() {
            const res = await api
                .get<AxiosResponse<ListRolesResponse>>(
                    `/org/${org?.org.orgId}/roles`
                )
                .catch((e) => {
                    console.error(e);
                    toast({
                        variant: "destructive",
                        title: "Failed to fetch roles",
                        description:
                            e.message ||
                            "An error occurred while fetching the roles",
                    });
                });

            if (res?.status === 200) {
                setRoles(res.data.data.roles);
                // form.setValue(
                //     "roleId",
                //     res.data.data.roles[0].roleId.toString()
                // );
            }
        }

        fetchRoles();
    }, [open]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);

        const res = await api
            .post<AxiosResponse<InviteUserResponse>>(
                `/role/${values.roleId}/add/${user.id}`
            )
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Failed to add user to role",
                    description:
                        e.response?.data?.message ||
                        "An error occurred while adding user to the role.",
                });
            });

        if (res && res.status === 200) {
            toast({
                variant: "default",
                title: "User invited",
                description: "The user has been updated.",
            });
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
                        <CredenzaTitle>Manage User</CredenzaTitle>
                        <CredenzaDescription>
                            Update the role of the user in the organization.
                        </CredenzaDescription>
                    </CredenzaHeader>
                    <CredenzaBody>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4"
                                id="manage-user-form"
                            >
                                <FormField
                                    control={form.control}
                                    name="email"
                                    disabled={true}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="User's email"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="roleId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Role</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select role" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {roles.map((role) => (
                                                        <SelectItem
                                                            key={role.roleId}
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
                    </CredenzaBody>
                    <CredenzaFooter>
                        <Button
                            type="submit"
                            form="manage-user-form"
                            loading={loading}
                            disabled={loading}
                        >
                            Save User
                        </Button>
                        <CredenzaClose asChild>
                            <Button variant="outline">Close</Button>
                        </CredenzaClose>
                    </CredenzaFooter>
                </CredenzaContent>
            </Credenza>
        </>
    );
}
