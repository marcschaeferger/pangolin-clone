"use client";

import api from "@app/api";
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
import { InviteUserResponse } from "@server/routers/user";
import { AxiosResponse } from "axios";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ListRolesResponse } from "@server/routers/role";
import { userOrgUserContext } from "@app/hooks/useOrgUserContext";
import { useParams } from "next/navigation";
import { Button } from "@app/components/ui/button";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";
import { formatAxiosError } from "@app/lib/utils";

const formSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email" }),
    roleId: z.string().min(1, { message: "Please select a role" }),
});

export default function AccessControlsPage() {
    const { toast } = useToast();
    const { orgUser: user } = userOrgUserContext();

    const { orgId } = useParams();

    const [loading, setLoading] = useState(false);
    const [roles, setRoles] = useState<{ roleId: number; name: string }[]>([]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: user.email!,
            roleId: user.roleId?.toString(),
        },
    });

    useEffect(() => {
        async function fetchRoles() {
            const res = await api
                .get<AxiosResponse<ListRolesResponse>>(`/org/${orgId}/roles`)
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

            if (res?.status === 200) {
                setRoles(res.data.data.roles);
            }
        }

        fetchRoles();

        form.setValue("roleId", user.roleId.toString());
    }, []);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);

        const res = await api
            .post<AxiosResponse<InviteUserResponse>>(
                `/role/${values.roleId}/add/${user.userId}`
            )
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Failed to add user to role",
                    description: formatAxiosError(
                        e,
                        "An error occurred while adding user to the role."
                    ),
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
            <SettingsSectionTitle
                title="Access Controls"
                description="Manage what this user can access and do in the organization"
                size="1xl"
            />

            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                >
                    <FormField
                        control={form.control}
                        name="roleId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
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
                    <Button type="submit" loading={loading} disabled={loading}>
                        Save Changes
                    </Button>
                </form>
            </Form>
        </>
    );
}
