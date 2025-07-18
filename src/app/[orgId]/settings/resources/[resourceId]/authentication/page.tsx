"use client";

import { useEffect, useState } from "react";
import { ListRolesResponse } from "@server/routers/role";
import { toast } from "@app/hooks/useToast";
import { useOrgContext } from "@app/hooks/useOrgContext";
import { useResourceContext } from "@app/hooks/useResourceContext";
import { AxiosResponse } from "axios";
import { formatAxiosError } from "@app/lib/api";
import {
    GetResourceWhitelistResponse,
    ListResourceRolesResponse,
    ListResourceUsersResponse
} from "@server/routers/resource";
import { Button } from "@app/components/ui/button";
import { set, z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@app/components/ui/form";
import { ListUsersResponse } from "@server/routers/user";
import { Binary, Key } from "lucide-react";
import SetResourcePasswordForm from "./SetResourcePasswordForm";
import SetResourcePincodeForm from "./SetResourcePincodeForm";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import {
    SettingsContainer,
    SettingsSection,
    SettingsSectionTitle,
    SettingsSectionHeader,
    SettingsSectionDescription,
    SettingsSectionBody,
    SettingsSectionFooter,
    SettingsSectionForm
} from "@app/components/Settings";
import { SwitchInput } from "@app/components/SwitchInput";
import { InfoPopup } from "@app/components/ui/info-popup";
import { Tag, TagInput } from "@app/components/tags/tag-input";
import { useRouter } from "next/navigation";
import { UserType } from "@server/types/UserTypes";
import { Alert, AlertDescription, AlertTitle } from "@app/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";

const UsersRolesFormSchema = z.object({
    roles: z.array(
        z.object({
            id: z.string(),
            text: z.string()
        })
    ),
    users: z.array(
        z.object({
            id: z.string(),
            text: z.string()
        })
    )
});

const whitelistSchema = z.object({
    emails: z.array(
        z.object({
            id: z.string(),
            text: z.string()
        })
    )
});

export default function ResourceAuthenticationPage() {
    const { org } = useOrgContext();
    const { resource, updateResource, authInfo, updateAuthInfo } =
        useResourceContext();

    const { env } = useEnvContext();

    const api = createApiClient({ env });
    const router = useRouter();
    const t = useTranslations();

    const [pageLoading, setPageLoading] = useState(true);

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

    const [activeEmailTagIndex, setActiveEmailTagIndex] = useState<
        number | null
    >(null);

    const [ssoEnabled, setSsoEnabled] = useState(resource.sso);
    // const [blockAccess, setBlockAccess] = useState(resource.blockAccess);
    const [whitelistEnabled, setWhitelistEnabled] = useState(
        resource.emailWhitelistEnabled
    );

    const [loadingSaveUsersRoles, setLoadingSaveUsersRoles] = useState(false);
    const [loadingSaveWhitelist, setLoadingSaveWhitelist] = useState(false);

    const [loadingRemoveResourcePassword, setLoadingRemoveResourcePassword] =
        useState(false);
    const [loadingRemoveResourcePincode, setLoadingRemoveResourcePincode] =
        useState(false);

    const [isSetPasswordOpen, setIsSetPasswordOpen] = useState(false);
    const [isSetPincodeOpen, setIsSetPincodeOpen] = useState(false);

    const usersRolesForm = useForm<z.infer<typeof UsersRolesFormSchema>>({
        resolver: zodResolver(UsersRolesFormSchema),
        defaultValues: { roles: [], users: [] }
    });

    const whitelistForm = useForm<z.infer<typeof whitelistSchema>>({
        resolver: zodResolver(whitelistSchema),
        defaultValues: { emails: [] }
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [
                    rolesResponse,
                    resourceRolesResponse,
                    usersResponse,
                    resourceUsersResponse,
                    whitelist
                ] = await Promise.all([
                    api.get<AxiosResponse<ListRolesResponse>>(
                        `/org/${org?.org.orgId}/roles`
                    ),
                    api.get<AxiosResponse<ListResourceRolesResponse>>(
                        `/resource/${resource.resourceId}/roles`
                    ),
                    api.get<AxiosResponse<ListUsersResponse>>(
                        `/org/${org?.org.orgId}/users`
                    ),
                    api.get<AxiosResponse<ListResourceUsersResponse>>(
                        `/resource/${resource.resourceId}/users`
                    ),
                    api.get<AxiosResponse<GetResourceWhitelistResponse>>(
                        `/resource/${resource.resourceId}/whitelist`
                    )
                ]);

                setAllRoles(
                    rolesResponse.data.data.roles
                        .map((role) => ({
                            id: role.roleId.toString(),
                            text: role.name
                        }))
                        .filter((role) => role.text !== "Admin")
                );

                usersRolesForm.setValue(
                    "roles",
                    resourceRolesResponse.data.data.roles
                        .map((i) => ({
                            id: i.roleId.toString(),
                            text: i.name
                        }))
                        .filter((role) => role.text !== "Admin")
                );

                setAllUsers(
                    usersResponse.data.data.users.map((user) => ({
                        id: user.id.toString(),
                        text: `${user.email || user.username}${user.type !== UserType.Internal ? ` (${user.idpName})` : ""}`
                    }))
                );

                usersRolesForm.setValue(
                    "users",
                    resourceUsersResponse.data.data.users.map((i) => ({
                        id: i.userId.toString(),
                        text: `${i.email || i.username}${i.type !== UserType.Internal ? ` (${i.idpName})` : ""}`
                    }))
                );

                whitelistForm.setValue(
                    "emails",
                    whitelist.data.data.whitelist.map((w) => ({
                        id: w.email,
                        text: w.email
                    }))
                );

                setPageLoading(false);
            } catch (e) {
                console.error(e);
                toast({
                    variant: "destructive",
                    title: t("resourceErrorAuthFetch"),
                    description: formatAxiosError(
                        e,
                        t("resourceErrorAuthFetchDescription")
                    )
                });
            }
        };

        fetchData();
    }, []);

    async function saveWhitelist() {
        setLoadingSaveWhitelist(true);
        try {
            await api.post(`/resource/${resource.resourceId}`, {
                emailWhitelistEnabled: whitelistEnabled
            });

            if (whitelistEnabled) {
                await api.post(`/resource/${resource.resourceId}/whitelist`, {
                    emails: whitelistForm.getValues().emails.map((i) => i.text)
                });
            }

            updateResource({
                emailWhitelistEnabled: whitelistEnabled
            });

            toast({
                title: t("resourceWhitelistSave"),
                description: t("resourceWhitelistSaveDescription")
            });
            router.refresh();
        } catch (e) {
            console.error(e);
            toast({
                variant: "destructive",
                title: t("resourceErrorWhitelistSave"),
                description: formatAxiosError(
                    e,
                    t("resourceErrorWhitelistSaveDescription")
                )
            });
        } finally {
            setLoadingSaveWhitelist(false);
        }
    }

    async function onSubmitUsersRoles(
        data: z.infer<typeof UsersRolesFormSchema>
    ) {
        try {
            setLoadingSaveUsersRoles(true);

            const jobs = [
                api.post(`/resource/${resource.resourceId}/roles`, {
                    roleIds: data.roles.map((i) => parseInt(i.id))
                }),
                api.post(`/resource/${resource.resourceId}/users`, {
                    userIds: data.users.map((i) => i.id)
                }),
                api.post(`/resource/${resource.resourceId}`, {
                    sso: ssoEnabled
                })
            ];

            await Promise.all(jobs);

            updateResource({
                sso: ssoEnabled
            });

            updateAuthInfo({
                sso: ssoEnabled
            });

            toast({
                title: t("resourceAuthSettingsSave"),
                description: t("resourceAuthSettingsSaveDescription")
            });
            router.refresh();
        } catch (e) {
            console.error(e);
            toast({
                variant: "destructive",
                title: t("resourceErrorUsersRolesSave"),
                description: formatAxiosError(
                    e,
                    t("resourceErrorUsersRolesSaveDescription")
                )
            });
        } finally {
            setLoadingSaveUsersRoles(false);
        }
    }

    function removeResourcePassword() {
        setLoadingRemoveResourcePassword(true);

        api.post(`/resource/${resource.resourceId}/password`, {
            password: null
        })
            .then(() => {
                toast({
                    title: t("resourcePasswordRemove"),
                    description: t("resourcePasswordRemoveDescription")
                });

                updateAuthInfo({
                    password: false
                });
                router.refresh();
            })
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: t("resourceErrorPasswordRemove"),
                    description: formatAxiosError(
                        e,
                        t("resourceErrorPasswordRemoveDescription")
                    )
                });
            })
            .finally(() => setLoadingRemoveResourcePassword(false));
    }

    function removeResourcePincode() {
        setLoadingRemoveResourcePincode(true);

        api.post(`/resource/${resource.resourceId}/pincode`, {
            pincode: null
        })
            .then(() => {
                toast({
                    title: t("resourcePincodeRemove"),
                    description: t("resourcePincodeRemoveDescription")
                });

                updateAuthInfo({
                    pincode: false
                });
                router.refresh();
            })
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: t("resourceErrorPincodeRemove"),
                    description: formatAxiosError(
                        e,
                        t("resourceErrorPincodeRemoveDescription")
                    )
                });
            })
            .finally(() => setLoadingRemoveResourcePincode(false));
    }

    if (pageLoading) {
        return <></>;
    }

    return (
        <>
            {isSetPasswordOpen && (
                <SetResourcePasswordForm
                    open={isSetPasswordOpen}
                    setOpen={setIsSetPasswordOpen}
                    resourceId={resource.resourceId}
                    onSetPassword={() => {
                        setIsSetPasswordOpen(false);
                        updateAuthInfo({
                            password: true
                        });
                    }}
                />
            )}

            {isSetPincodeOpen && (
                <SetResourcePincodeForm
                    open={isSetPincodeOpen}
                    setOpen={setIsSetPincodeOpen}
                    resourceId={resource.resourceId}
                    onSetPincode={() => {
                        setIsSetPincodeOpen(false);
                        updateAuthInfo({
                            pincode: true
                        });
                    }}
                />
            )}

            <SettingsContainer>
                <SettingsSection>
                    <SettingsSectionHeader>
                        <SettingsSectionTitle>
                            {t("resourceUsersRoles")}
                        </SettingsSectionTitle>
                        <SettingsSectionDescription>
                            {t("resourceUsersRolesDescription")}
                        </SettingsSectionDescription>
                    </SettingsSectionHeader>
                    <SettingsSectionBody>
                        <SettingsSectionForm>
                            <SwitchInput
                                id="sso-toggle"
                                label={t("ssoUse")}
                                defaultChecked={resource.sso}
                                onCheckedChange={(val) => setSsoEnabled(val)}
                            />

                            <Form {...usersRolesForm}>
                                <form
                                    onSubmit={usersRolesForm.handleSubmit(
                                        onSubmitUsersRoles
                                    )}
                                    id="users-roles-form"
                                    className="space-y-4"
                                >
                                    {ssoEnabled && (
                                        <>
                                            <FormField
                                                control={usersRolesForm.control}
                                                name="roles"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col items-start">
                                                        <FormLabel>
                                                            {t("roles")}
                                                        </FormLabel>
                                                        <FormControl>
                                                            <TagInput
                                                                {...field}
                                                                activeTagIndex={
                                                                    activeRolesTagIndex
                                                                }
                                                                setActiveTagIndex={
                                                                    setActiveRolesTagIndex
                                                                }
                                                                placeholder={t(
                                                                    "accessRoleSelect2"
                                                                )}
                                                                size="sm"
                                                                tags={
                                                                    usersRolesForm.getValues()
                                                                        .roles
                                                                }
                                                                setTags={(
                                                                    newRoles
                                                                ) => {
                                                                    usersRolesForm.setValue(
                                                                        "roles",
                                                                        newRoles as [
                                                                            Tag,
                                                                            ...Tag[]
                                                                        ]
                                                                    );
                                                                }}
                                                                enableAutocomplete={
                                                                    true
                                                                }
                                                                autocompleteOptions={
                                                                    allRoles
                                                                }
                                                                allowDuplicates={
                                                                    false
                                                                }
                                                                restrictTagsToAutocompleteOptions={
                                                                    true
                                                                }
                                                                sortTags={true}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                        <FormDescription>
                                                            {t(
                                                                "resourceRoleDescription"
                                                            )}
                                                        </FormDescription>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={usersRolesForm.control}
                                                name="users"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col items-start">
                                                        <FormLabel>
                                                            {t("users")}
                                                        </FormLabel>
                                                        <FormControl>
                                                            <TagInput
                                                                {...field}
                                                                activeTagIndex={
                                                                    activeUsersTagIndex
                                                                }
                                                                setActiveTagIndex={
                                                                    setActiveUsersTagIndex
                                                                }
                                                                placeholder={t(
                                                                    "accessUserSelect"
                                                                )}
                                                                tags={
                                                                    usersRolesForm.getValues()
                                                                        .users
                                                                }
                                                                size="sm"
                                                                setTags={(
                                                                    newUsers
                                                                ) => {
                                                                    usersRolesForm.setValue(
                                                                        "users",
                                                                        newUsers as [
                                                                            Tag,
                                                                            ...Tag[]
                                                                        ]
                                                                    );
                                                                }}
                                                                enableAutocomplete={
                                                                    true
                                                                }
                                                                autocompleteOptions={
                                                                    allUsers
                                                                }
                                                                allowDuplicates={
                                                                    false
                                                                }
                                                                restrictTagsToAutocompleteOptions={
                                                                    true
                                                                }
                                                                sortTags={true}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </>
                                    )}
                                </form>
                            </Form>
                        </SettingsSectionForm>
                    </SettingsSectionBody>
                    <SettingsSectionFooter>
                        <Button
                            type="submit"
                            loading={loadingSaveUsersRoles}
                            disabled={loadingSaveUsersRoles}
                            form="users-roles-form"
                        >
                            {t("resourceUsersRolesSubmit")}
                        </Button>
                    </SettingsSectionFooter>
                </SettingsSection>

                <SettingsSection>
                    <SettingsSectionHeader>
                        <SettingsSectionTitle>
                            {t("resourceAuthMethods")}
                        </SettingsSectionTitle>
                        <SettingsSectionDescription>
                            {t("resourceAuthMethodsDescriptions")}
                        </SettingsSectionDescription>
                    </SettingsSectionHeader>
                    <SettingsSectionBody>
                        <SettingsSectionForm>
                            {/* Password Protection */}
                            <div className="flex items-center justify-between border rounded-md p-2 mb-4">
                                <div
                                    className={`flex items-center ${!authInfo.password ? "text-muted-foreground" : "text-green-500"} text-sm space-x-2`}
                                >
                                    <Key size="14" />
                                    <span>
                                        {t("resourcePasswordProtection", {
                                            status: authInfo.password
                                                ? t("enabled")
                                                : t("disabled")
                                        })}
                                    </span>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={
                                        authInfo.password
                                            ? removeResourcePassword
                                            : () => setIsSetPasswordOpen(true)
                                    }
                                    loading={loadingRemoveResourcePassword}
                                >
                                    {authInfo.password
                                        ? t("passwordRemove")
                                        : t("passwordAdd")}
                                </Button>
                            </div>

                            {/* PIN Code Protection */}
                            <div className="flex items-center justify-between border rounded-md p-2">
                                <div
                                    className={`flex items-center ${!authInfo.pincode ? "text-muted-foreground" : "text-green-500"} space-x-2 text-sm`}
                                >
                                    <Binary size="14" />
                                    <span>
                                        {t("resourcePincodeProtection", {
                                            status: authInfo.pincode
                                                ? t("enabled")
                                                : t("disabled")
                                        })}
                                    </span>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={
                                        authInfo.pincode
                                            ? removeResourcePincode
                                            : () => setIsSetPincodeOpen(true)
                                    }
                                    loading={loadingRemoveResourcePincode}
                                >
                                    {authInfo.pincode
                                        ? t("pincodeRemove")
                                        : t("pincodeAdd")}
                                </Button>
                            </div>
                        </SettingsSectionForm>
                    </SettingsSectionBody>
                </SettingsSection>

                <SettingsSection>
                    <SettingsSectionHeader>
                        <SettingsSectionTitle>
                            {t("otpEmailTitle")}
                        </SettingsSectionTitle>
                        <SettingsSectionDescription>
                            {t("otpEmailTitleDescription")}
                        </SettingsSectionDescription>
                    </SettingsSectionHeader>
                    <SettingsSectionBody>
                        <SettingsSectionForm>
                            {!env.email.emailEnabled && (
                                <Alert variant="neutral" className="mb-4">
                                    <InfoIcon className="h-4 w-4" />
                                    <AlertTitle className="font-semibold">
                                        {t("otpEmailSmtpRequired")}
                                    </AlertTitle>
                                    <AlertDescription>
                                        {t("otpEmailSmtpRequiredDescription")}
                                    </AlertDescription>
                                </Alert>
                            )}
                            <SwitchInput
                                id="whitelist-toggle"
                                label={t("otpEmailWhitelist")}
                                defaultChecked={resource.emailWhitelistEnabled}
                                onCheckedChange={setWhitelistEnabled}
                                disabled={!env.email.emailEnabled}
                            />

                            {whitelistEnabled && env.email.emailEnabled && (
                                <Form {...whitelistForm}>
                                    <form id="whitelist-form">
                                        <FormField
                                            control={whitelistForm.control}
                                            name="emails"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        <InfoPopup
                                                            text={t(
                                                                "otpEmailWhitelistList"
                                                            )}
                                                            info={t(
                                                                "otpEmailWhitelistListDescription"
                                                            )}
                                                        />
                                                    </FormLabel>
                                                    <FormControl>
                                                        {/* @ts-ignore */}
                                                        <TagInput
                                                            {...field}
                                                            activeTagIndex={
                                                                activeEmailTagIndex
                                                            }
                                                            size={"sm"}
                                                            validateTag={(
                                                                tag
                                                            ) => {
                                                                return z
                                                                    .string()
                                                                    .email()
                                                                    .or(
                                                                        z
                                                                            .string()
                                                                            .regex(
                                                                                /^\*@[\w.-]+\.[a-zA-Z]{2,}$/,
                                                                                {
                                                                                    message:
                                                                                        t(
                                                                                            "otpEmailErrorInvalid"
                                                                                        )
                                                                                }
                                                                            )
                                                                    )
                                                                    .safeParse(
                                                                        tag
                                                                    ).success;
                                                            }}
                                                            setActiveTagIndex={
                                                                setActiveEmailTagIndex
                                                            }
                                                            placeholder={t(
                                                                "otpEmailEnter"
                                                            )}
                                                            tags={
                                                                whitelistForm.getValues()
                                                                    .emails
                                                            }
                                                            setTags={(
                                                                newRoles
                                                            ) => {
                                                                whitelistForm.setValue(
                                                                    "emails",
                                                                    newRoles as [
                                                                        Tag,
                                                                        ...Tag[]
                                                                    ]
                                                                );
                                                            }}
                                                            allowDuplicates={
                                                                false
                                                            }
                                                            sortTags={true}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        {t(
                                                            "otpEmailEnterDescription"
                                                        )}
                                                    </FormDescription>
                                                </FormItem>
                                            )}
                                        />
                                    </form>
                                </Form>
                            )}
                        </SettingsSectionForm>
                    </SettingsSectionBody>
                    <SettingsSectionFooter>
                        <Button
                            onClick={saveWhitelist}
                            form="whitelist-form"
                            loading={loadingSaveWhitelist}
                            disabled={loadingSaveWhitelist}
                        >
                            {t("otpEmailWhitelistSave")}
                        </Button>
                    </SettingsSectionFooter>
                </SettingsSection>
            </SettingsContainer>
        </>
    );
}
