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
import { Input } from "@app/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@app/components/ui/select";
import { toast } from "@app/hooks/useToast";
import { zodResolver } from "@hookform/resolvers/zod";
import { InviteUserBody, InviteUserResponse } from "@server/routers/user";
import { AxiosResponse } from "axios";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import CopyTextBox from "@app/components/CopyTextBox";
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
import { formatAxiosError } from "@app/lib/api";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { Checkbox } from "@app/components/ui/checkbox";

type InviteUserFormProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
};

const formSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    validForHours: z.string().min(1, { message: "Please select a duration" }),
    roleId: z.string().min(1, { message: "Please select a role" })
});

export default function InviteUserForm({ open, setOpen }: InviteUserFormProps) {
    const { org } = useOrgContext();
    const { env } = useEnvContext();
    const api = createApiClient({ env });

    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [expiresInDays, setExpiresInDays] = useState(1);
    const [roles, setRoles] = useState<{ roleId: number; name: string }[]>([]);
    const [sendEmail, setSendEmail] = useState(env.email.emailEnabled);

    const validFor = [
        { hours: 24, name: "1 day" },
        { hours: 48, name: "2 days" },
        { hours: 72, name: "3 days" },
        { hours: 96, name: "4 days" },
        { hours: 120, name: "5 days" },
        { hours: 144, name: "6 days" },
        { hours: 168, name: "7 days" }
    ];

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            validForHours: "72",
            roleId: ""
        }
    });

    useEffect(() => {
        if (open) {
            setSendEmail(env.email.emailEnabled);
            form.reset();
            setInviteLink(null);
            setExpiresInDays(1);
        }
    }, [open, env.email.emailEnabled, form]);

    useEffect(() => {
        if (!open) {
            return;
        }

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
                setRoles(res.data.data.roles);
            }
        }

        fetchRoles();
    }, [open]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);

        const res = await api
            .post<AxiosResponse<InviteUserResponse>>(
                `/org/${org?.org.orgId}/create-invite`,
                {
                    email: values.email,
                    roleId: parseInt(values.roleId),
                    validHours: parseInt(values.validForHours),
                    sendEmail: sendEmail
                } as InviteUserBody
            )
            .catch((e) => {
                if (e.response?.status === 409) {
                    toast({
                        variant: "destructive",
                        title: "User Already Exists",
                        description:
                            "This user is already a member of the organization."
                    });
                } else {
                    toast({
                        variant: "destructive",
                        title: "Failed to invite user",
                        description: formatAxiosError(
                            e,
                            "An error occurred while inviting the user"
                        )
                    });
                }
            });

        if (res && res.status === 200) {
            setInviteLink(res.data.data.inviteLink);
            toast({
                variant: "default",
                title: "User invited",
                description: "The user has been successfully invited."
            });

            setExpiresInDays(parseInt(values.validForHours) / 24);
        }

        setLoading(false);
    }

    return (
        <>
            <Credenza
                open={open}
                onOpenChange={(val) => {
                    setOpen(val);
                    if (!val) {
                        setInviteLink(null);
                        setLoading(false);
                        setExpiresInDays(1);
                        form.reset();
                    }
                }}
            >
                <CredenzaContent>
                    <CredenzaHeader>
                        <CredenzaTitle>Invite User</CredenzaTitle>
                        <CredenzaDescription>
                            Give new users access to your organization
                        </CredenzaDescription>
                    </CredenzaHeader>
                    <CredenzaBody>
                        <div className="space-y-4">
                            {!inviteLink && (
                                <Form {...form}>
                                    <form
                                        onSubmit={form.handleSubmit(onSubmit)}
                                        className="space-y-4"
                                        id="invite-user-form"
                                    >
                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {env.email.emailEnabled && (
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="send-email"
                                                    checked={sendEmail}
                                                    onCheckedChange={(e) =>
                                                        setSendEmail(
                                                            e as boolean
                                                        )
                                                    }
                                                />
                                                <label
                                                    htmlFor="send-email"
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                >
                                                    Send invite email to user
                                                </label>
                                            </div>
                                        )}

                                        <FormField
                                            control={form.control}
                                            name="roleId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Role</FormLabel>
                                                    <Select
                                                        onValueChange={
                                                            field.onChange
                                                        }
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select role" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {roles.map(
                                                                (role) => (
                                                                    <SelectItem
                                                                        key={
                                                                            role.roleId
                                                                        }
                                                                        value={role.roleId.toString()}
                                                                    >
                                                                        {
                                                                            role.name
                                                                        }
                                                                    </SelectItem>
                                                                )
                                                            )}
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
                                                    <FormLabel>
                                                        Valid For
                                                    </FormLabel>
                                                    <Select
                                                        onValueChange={
                                                            field.onChange
                                                        }
                                                        defaultValue={field.value.toString()}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select duration" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {validFor.map(
                                                                (option) => (
                                                                    <SelectItem
                                                                        key={
                                                                            option.hours
                                                                        }
                                                                        value={option.hours.toString()}
                                                                    >
                                                                        {
                                                                            option.name
                                                                        }
                                                                    </SelectItem>
                                                                )
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </form>
                                </Form>
                            )}

                            {inviteLink && (
                                <div className="max-w-md space-y-4">
                                    {sendEmail && (
                                        <p>
                                            An email has been sent to the user
                                            with the access link below. They
                                            must access the link to accept the
                                            invitation.
                                        </p>
                                    )}
                                    {!sendEmail && (
                                        <p>
                                            The user has been invited. They must
                                            access the link below to accept the
                                            invitation.
                                        </p>
                                    )}
                                    <p>
                                        The invite will expire in{" "}
                                        <b>
                                            {expiresInDays}{" "}
                                            {expiresInDays === 1
                                                ? "day"
                                                : "days"}
                                        </b>
                                        .
                                    </p>
                                    <CopyTextBox
                                        text={inviteLink}
                                        wrapText={false}
                                    />
                                </div>
                            )}
                        </div>
                    </CredenzaBody>
                    <CredenzaFooter>
                        <CredenzaClose asChild>
                            <Button variant="outline">Close</Button>
                        </CredenzaClose>
                        <Button
                            type="submit"
                            form="invite-user-form"
                            loading={loading}
                            disabled={inviteLink !== null || loading}
                        >
                            Create Invitation
                        </Button>
                    </CredenzaFooter>
                </CredenzaContent>
            </Credenza>
        </>
    );
}
