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
import { useToast } from "@app/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { InviteUserBody, InviteUserResponse } from "@server/routers/user";
import { AxiosResponse } from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useParams } from "next/navigation";
import CopyTextBox from "@app/components/CopyTextBox";

const formSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    validForHours: z.string(),
    roleId: z.string(),
});

export default function InviteUserForm() {
    const { toast } = useToast();
    const { orgId } = useParams();

    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [expiresInDays, setExpiresInDays] = useState(1);

    const roles = [
        { roleId: 1, name: "Super User" },
        { roleId: 2, name: "Admin" },
        { roleId: 3, name: "Power User" },
        { roleId: 4, name: "User" },
        { roleId: 5, name: "Guest" },
    ];

    const validFor = [
        { hours: 24, name: "1 day" },
        { hours: 48, name: "2 days" },
        { hours: 72, name: "3 days" },
        { hours: 96, name: "4 days" },
        { hours: 120, name: "5 days" },
        { hours: 144, name: "6 days" },
        { hours: 168, name: "7 days" },
    ];

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            validForHours: "24",
            roleId: "4",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);

        const res = await api
            .post<AxiosResponse<InviteUserResponse>>(
                `/org/${orgId}/create-invite`,
                {
                    email: values.email,
                    roleId: parseInt(values.roleId),
                    validHours: parseInt(values.validForHours),
                } as InviteUserBody
            )
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Failed to invite user",
                    description:
                        e.response?.data?.message ||
                        "An error occurred while inviting the user.",
                });
            });

        if (res && res.status === 200) {
            setInviteLink(res.data.data.inviteLink);
            toast({
                variant: "default",
                title: "User invited",
                description: "The user has been successfully invited.",
            });

            setExpiresInDays(parseInt(values.validForHours) / 24);
        }

        setLoading(false);
    }

    return (
        <>
            {!inviteLink && (
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter an email"
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
                                        defaultValue={field.value.toString()}
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
                        <FormField
                            control={form.control}
                            name="validForHours"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Valid For</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value.toString()}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select duration" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {validFor.map((option) => (
                                                <SelectItem
                                                    key={option.hours}
                                                    value={option.hours.toString()}
                                                >
                                                    {option.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-center">
                            <Button
                                type="submit"
                                loading={loading}
                                disabled={inviteLink !== null}
                            >
                                Invite User
                            </Button>
                        </div>
                    </form>
                </Form>
            )}

            {inviteLink && (
                <div className="max-w-md">
                    <p className="mb-4">
                        The user has been successfully invited. They must access
                        the link below to accept the invitation.
                    </p>
                    <p className="mb-4">
                        The invite will expire in{" "}
                        <b>
                            {expiresInDays}{" "}
                            {expiresInDays === 1 ? "day" : "days"}
                        </b>
                        .
                    </p>
                    {/* <CopyTextBox text={inviteLink} wrapText={false} /> */}
                </div>
            )}
        </>
    );
}
