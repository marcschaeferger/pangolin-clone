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
import { StrategySelect } from "@app/components/StrategySelect";
import HeaderTitle from "@app/components/SettingsSectionTitle";
import { Button } from "@app/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
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
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import CopyTextBox from "@app/components/CopyTextBox";
import { useOrgContext } from "@app/hooks/useOrgContext";
import { ListRolesResponse } from "@server/routers/role";
import { formatAxiosError } from "@app/lib/api";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { Checkbox } from "@app/components/ui/checkbox";

type UserType = "internal" | "external";

interface UserTypeOption {
    id: UserType;
    title: string;
    description: string;
}

const formSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    validForHours: z.string().min(1, { message: "Please select a duration" }),
    roleId: z.string().min(1, { message: "Please select a role" })
});

export default function Page() {
    const { orgId } = useParams();
    const router = useRouter();
    const { env } = useEnvContext();
    const api = createApiClient({ env });

    const [userType, setUserType] = useState<UserType | null>("internal");
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
        if (userType === "internal") {
            setSendEmail(env.email.emailEnabled);
            form.reset();
            setInviteLink(null);
            setExpiresInDays(1);
        }
    }, [userType, env.email.emailEnabled, form]);

    useEffect(() => {
        if (userType !== "internal") {
            return;
        }

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
                        )
                    });
                });

            if (res?.status === 200) {
                setRoles(res.data.data.roles);
            }
        }

        fetchRoles();
    }, [userType]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);

        const res = await api
            .post<AxiosResponse<InviteUserResponse>>(
                `/org/${orgId}/create-invite`,
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

    const userTypes: ReadonlyArray<UserTypeOption> = [
        {
            id: "internal",
            title: "Internal User",
            description: "Invite a user to join your organization directly."
        },
        {
            id: "external",
            title: "External User",
            description:
                "Provision a user with an external identity provider (IdP)."
        }
    ];

    return (
        <>
            <div className="flex justify-between">
                <HeaderTitle
                    title="Create User"
                    description="Follow the steps below to create a new user"
                />
                <Button
                    variant="outline"
                    onClick={() => {
                        router.push(`/${orgId}/settings/access/users`);
                    }}
                >
                    See All Users
                </Button>
            </div>

            <div>
                <SettingsContainer>
                    <SettingsSection>
                        <SettingsSectionHeader>
                            <SettingsSectionTitle>
                                User Type
                            </SettingsSectionTitle>
                            <SettingsSectionDescription>
                                Determine how you want to create the user
                            </SettingsSectionDescription>
                        </SettingsSectionHeader>
                        <SettingsSectionBody>
                            <StrategySelect
                                options={userTypes}
                                defaultValue={userType || undefined}
                                onChange={(value) => {
                                    setUserType(value as UserType);
                                }}
                                cols={2}
                            />
                        </SettingsSectionBody>
                    </SettingsSection>

                    {userType === "internal" && (
                        <SettingsSection>
                            <SettingsSectionHeader>
                                <SettingsSectionTitle>
                                    User Information
                                </SettingsSectionTitle>
                                <SettingsSectionDescription>
                                    Enter the details for the new user
                                </SettingsSectionDescription>
                            </SettingsSectionHeader>
                            <SettingsSectionBody>
                                <SettingsSectionForm>
                                    <Form {...form}>
                                        <form
                                            onSubmit={form.handleSubmit(
                                                onSubmit
                                            )}
                                            className="space-y-4"
                                            id="invite-user-form"
                                        >
                                            <FormField
                                                control={form.control}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Email
                                                        </FormLabel>
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
                                                        Send invite email to
                                                        user
                                                    </label>
                                                </div>
                                            )}

                                            <FormField
                                                control={form.control}
                                                name="roleId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Role
                                                        </FormLabel>
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
                                                                    (
                                                                        option
                                                                    ) => (
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

                                            {inviteLink && (
                                                <div className="space-y-4">
                                                    {sendEmail && (
                                                        <p>
                                                            An email has been
                                                            sent to the user
                                                            with the access link
                                                            below. They must
                                                            access the link to
                                                            accept the
                                                            invitation.
                                                        </p>
                                                    )}
                                                    {!sendEmail && (
                                                        <p>
                                                            The user has been
                                                            invited. They must
                                                            access the link
                                                            below to accept the
                                                            invitation.
                                                        </p>
                                                    )}
                                                    <p>
                                                        The invite will expire
                                                        in{" "}
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
                                        </form>
                                    </Form>
                                </SettingsSectionForm>
                            </SettingsSectionBody>
                        </SettingsSection>
                    )}
                </SettingsContainer>

                <div className="flex justify-end space-x-2 mt-8">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            router.push(`/${orgId}/settings/access/users`);
                        }}
                    >
                        Cancel
                    </Button>
                    {userType === "internal" && (
                        <Button
                            type="submit"
                            form="invite-user-form"
                            loading={loading}
                            disabled={inviteLink !== null || loading}
                        >
                            Create User
                        </Button>
                    )}
                </div>
            </div>
        </>
    );
}
