"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatAxiosError } from "@app/lib/api";
import { Button } from "@/components/ui/button";
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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem
} from "@/components/ui/command";
import { cn } from "@app/lib/cn";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";
import { useResourceContext } from "@app/hooks/useResourceContext";
import { ListSitesResponse } from "@server/routers/site";
import { useEffect, useState } from "react";
import { AxiosResponse } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "@app/hooks/useToast";
import {
    SettingsContainer,
    SettingsSection,
    SettingsSectionHeader,
    SettingsSectionTitle,
    SettingsSectionDescription,
    SettingsSectionBody,
    SettingsSectionForm,
    SettingsSectionFooter
} from "@app/components/Settings";
import { useOrgContext } from "@app/hooks/useOrgContext";
import CustomDomainInput from "../CustomDomainInput";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { subdomainSchema, tlsNameSchema } from "@server/lib/schemas";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { RadioGroup, RadioGroupItem } from "@app/components/ui/radio-group";
import { Label } from "@app/components/ui/label";
import { ListDomainsResponse } from "@server/routers/domain";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@app/components/ui/select";
import {
    UpdateResourceResponse,
    updateResourceRule
} from "@server/routers/resource";
import { SwitchInput } from "@app/components/SwitchInput";

const GeneralFormSchema = z
    .object({
        subdomain: z.string().optional(),
        name: z.string().min(1).max(255),
        proxyPort: z.number().optional(),
        http: z.boolean(),
        isBaseDomain: z.boolean().optional(),
        domainId: z.string().optional()
    })
    .refine(
        (data) => {
            if (!data.http) {
                return z
                    .number()
                    .int()
                    .min(1)
                    .max(65535)
                    .safeParse(data.proxyPort).success;
            }
            return true;
        },
        {
            message: "Invalid port number",
            path: ["proxyPort"]
        }
    )
    .refine(
        (data) => {
            if (data.http && !data.isBaseDomain) {
                return subdomainSchema.safeParse(data.subdomain).success;
            }
            return true;
        },
        {
            message: "Invalid subdomain",
            path: ["subdomain"]
        }
    );

const TransferFormSchema = z.object({
    siteId: z.number()
});

type GeneralFormValues = z.infer<typeof GeneralFormSchema>;
type TransferFormValues = z.infer<typeof TransferFormSchema>;

export default function GeneralForm() {
    const [formKey, setFormKey] = useState(0);
    const params = useParams();
    const { resource, updateResource } = useResourceContext();
    const { org } = useOrgContext();
    const router = useRouter();

    const { env } = useEnvContext();

    const orgId = params.orgId;

    const api = createApiClient({ env });

    const [sites, setSites] = useState<ListSitesResponse["sites"]>([]);
    const [saveLoading, setSaveLoading] = useState(false);
    const [transferLoading, setTransferLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [baseDomains, setBaseDomains] = useState<
        ListDomainsResponse["domains"]
    >([]);

    const [loadingPage, setLoadingPage] = useState(true);
    const [domainType, setDomainType] = useState<"subdomain" | "basedomain">(
        resource.isBaseDomain ? "basedomain" : "subdomain"
    );

    const form = useForm<GeneralFormValues>({
        resolver: zodResolver(GeneralFormSchema),
        defaultValues: {
            name: resource.name,
            subdomain: resource.subdomain ? resource.subdomain : undefined,
            proxyPort: resource.proxyPort ? resource.proxyPort : undefined,
            http: resource.http,
            isBaseDomain: resource.isBaseDomain ? true : false,
            domainId: resource.domainId || undefined
        },
        mode: "onChange"
    });

    const transferForm = useForm<TransferFormValues>({
        resolver: zodResolver(TransferFormSchema),
        defaultValues: {
            siteId: resource.siteId ? Number(resource.siteId) : undefined
        }
    });

    useEffect(() => {
        const fetchSites = async () => {
            const res = await api.get<AxiosResponse<ListSitesResponse>>(
                `/org/${orgId}/sites/`
            );
            setSites(res.data.data.sites);
        };

        const fetchDomains = async () => {
            const res = await api
                .get<
                    AxiosResponse<ListDomainsResponse>
                >(`/org/${orgId}/domains/`)
                .catch((e) => {
                    toast({
                        variant: "destructive",
                        title: "Error fetching domains",
                        description: formatAxiosError(
                            e,
                            "An error occurred when fetching the domains"
                        )
                    });
                });

            if (res?.status === 200) {
                const domains = res.data.data.domains;
                setBaseDomains(domains);
                setFormKey((key) => key + 1);
            }
        };

        const load = async () => {
            await fetchDomains();
            await fetchSites();

            setLoadingPage(false);
        };

        load();
    }, []);

    async function onSubmit(data: GeneralFormValues) {
        setSaveLoading(true);

        const res = await api
            .post<AxiosResponse<UpdateResourceResponse>>(
                `resource/${resource?.resourceId}`,
                {
                    name: data.name,
                    subdomain: data.http ? data.subdomain : undefined,
                    proxyPort: data.proxyPort,
                    isBaseDomain: data.http ? data.isBaseDomain : undefined,
                    domainId: data.http ? data.domainId : undefined
                }
            )
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Failed to update resource",
                    description: formatAxiosError(
                        e,
                        "An error occurred while updating the resource"
                    )
                });
            });

        if (res && res.status === 200) {
            toast({
                title: "Resource updated",
                description: "The resource has been updated successfully"
            });

            const resource = res.data.data;

            updateResource({
                name: data.name,
                subdomain: data.subdomain,
                proxyPort: data.proxyPort,
                isBaseDomain: data.isBaseDomain,
                fullDomain: resource.fullDomain
            });

            router.refresh();
        }
        setSaveLoading(false);
    }

    async function onTransfer(data: TransferFormValues) {
        setTransferLoading(true);

        const res = await api
            .post(`resource/${resource?.resourceId}/transfer`, {
                siteId: data.siteId
            })
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Failed to transfer resource",
                    description: formatAxiosError(
                        e,
                        "An error occurred while transferring the resource"
                    )
                });
            });

        if (res && res.status === 200) {
            toast({
                title: "Resource transferred",
                description: "The resource has been transferred successfully"
            });
            router.refresh();

            updateResource({
                siteName:
                    sites.find((site) => site.siteId === data.siteId)?.name ||
                    ""
            });
        }
        setTransferLoading(false);
    }

    async function toggleResourceEnabled(val: boolean) {
        const res = await api
            .post<AxiosResponse<UpdateResourceResponse>>(
                `resource/${resource.resourceId}`,
                {
                    enabled: val
                }
            )
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Failed to toggle resource",
                    description: formatAxiosError(
                        e,
                        "An error occurred while updating the resource"
                    )
                });
            });

        updateResource({
            enabled: val
        });
    }

    return (
        !loadingPage && (
            <SettingsContainer>
                <SettingsSection>
                    <SettingsSectionHeader>
                        <SettingsSectionTitle>Visibility</SettingsSectionTitle>
                        <SettingsSectionDescription>
                            Completely enable or disable resource visibility
                        </SettingsSectionDescription>
                    </SettingsSectionHeader>
                    <SettingsSectionBody>
                        <SwitchInput
                            id="enable-resource"
                            label="Enable Resource"
                            defaultChecked={resource.enabled}
                            onCheckedChange={async (val) => {
                                await toggleResourceEnabled(val);
                            }}
                        />
                    </SettingsSectionBody>
                </SettingsSection>

                <SettingsSection>
                    <SettingsSectionHeader>
                        <SettingsSectionTitle>
                            General Settings
                        </SettingsSectionTitle>
                        <SettingsSectionDescription>
                            Configure the general settings for this resource
                        </SettingsSectionDescription>
                    </SettingsSectionHeader>

                    <SettingsSectionBody>
                        <SettingsSectionForm>
                            <Form {...form} key={formKey}>
                                <form
                                    onSubmit={form.handleSubmit(onSubmit)}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                    id="general-settings-form"
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
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {resource.http && (
                                        <>
                                            {env.flags
                                                .allowBaseDomainResources && (
                                                <FormField
                                                    control={form.control}
                                                    name="isBaseDomain"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>
                                                                Domain Type
                                                            </FormLabel>
                                                            <Select
                                                                value={
                                                                    domainType
                                                                }
                                                                onValueChange={(
                                                                    val
                                                                ) => {
                                                                    setDomainType(
                                                                        val ===
                                                                            "basedomain"
                                                                            ? "basedomain"
                                                                            : "subdomain"
                                                                    );
                                                                    form.setValue(
                                                                        "isBaseDomain",
                                                                        val ===
                                                                            "basedomain"
                                                                            ? true
                                                                            : false
                                                                    );
                                                                }}
                                                            >
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="subdomain">
                                                                        Subdomain
                                                                    </SelectItem>
                                                                    <SelectItem value="basedomain">
                                                                        Base
                                                                        Domain
                                                                    </SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            )}

                                            <div className="col-span-2">
                                                {domainType === "subdomain" ? (
                                                    <div className="w-fill space-y-2">
                                                        <FormLabel>
                                                            Subdomain
                                                        </FormLabel>
                                                        <div className="flex">
                                                            <div className="w-1/2">
                                                                <FormField
                                                                    control={
                                                                        form.control
                                                                    }
                                                                    name="subdomain"
                                                                    render={({
                                                                        field
                                                                    }) => (
                                                                        <FormItem>
                                                                            <FormControl>
                                                                                <Input
                                                                                    {...field}
                                                                                    className="border-r-0 rounded-r-none"
                                                                                />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            </div>
                                                            <div className="w-1/2">
                                                                <FormField
                                                                    control={
                                                                        form.control
                                                                    }
                                                                    name="domainId"
                                                                    render={({
                                                                        field
                                                                    }) => (
                                                                        <FormItem>
                                                                            <Select
                                                                                onValueChange={
                                                                                    field.onChange
                                                                                }
                                                                                defaultValue={
                                                                                    field.value
                                                                                }
                                                                                value={
                                                                                    field.value
                                                                                }
                                                                            >
                                                                                <FormControl>
                                                                                    <SelectTrigger className="rounded-l-none">
                                                                                        <SelectValue />
                                                                                    </SelectTrigger>
                                                                                </FormControl>
                                                                                <SelectContent>
                                                                                    {baseDomains.map(
                                                                                        (
                                                                                            option
                                                                                        ) => (
                                                                                            <SelectItem
                                                                                                key={
                                                                                                    option.domainId
                                                                                                }
                                                                                                value={
                                                                                                    option.domainId
                                                                                                }
                                                                                            >
                                                                                                .
                                                                                                {
                                                                                                    option.baseDomain
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
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <FormField
                                                        control={form.control}
                                                        name="domainId"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Base Domain
                                                                </FormLabel>
                                                                <Select
                                                                    onValueChange={
                                                                        field.onChange
                                                                    }
                                                                    defaultValue={
                                                                        field.value ||
                                                                        baseDomains[0]
                                                                            ?.domainId
                                                                    }
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {baseDomains.map(
                                                                            (
                                                                                option
                                                                            ) => (
                                                                                <SelectItem
                                                                                    key={
                                                                                        option.domainId
                                                                                    }
                                                                                    value={
                                                                                        option.domainId
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        option.baseDomain
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
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {!resource.http && (
                                        <FormField
                                            control={form.control}
                                            name="proxyPort"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Port Number
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            value={
                                                                field.value ??
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                field.onChange(
                                                                    e.target
                                                                        .value
                                                                        ? parseInt(
                                                                              e
                                                                                  .target
                                                                                  .value
                                                                          )
                                                                        : null
                                                                )
                                                            }
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </form>
                            </Form>
                        </SettingsSectionForm>
                    </SettingsSectionBody>

                    <SettingsSectionFooter>
                        <Button
                            type="submit"
                            loading={saveLoading}
                            disabled={saveLoading}
                            form="general-settings-form"
                        >
                            Save General Settings
                        </Button>
                    </SettingsSectionFooter>
                </SettingsSection>

                <SettingsSection>
                    <SettingsSectionHeader>
                        <SettingsSectionTitle>
                            Transfer Resource
                        </SettingsSectionTitle>
                        <SettingsSectionDescription>
                            Transfer this resource to a different site
                        </SettingsSectionDescription>
                    </SettingsSectionHeader>

                    <SettingsSectionBody>
                        <SettingsSectionForm>
                            <Form {...transferForm}>
                                <form
                                    onSubmit={transferForm.handleSubmit(
                                        onTransfer
                                    )}
                                    className="space-y-4"
                                    id="transfer-form"
                                >
                                    <FormField
                                        control={transferForm.control}
                                        name="siteId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Destination Site
                                                </FormLabel>
                                                <Popover
                                                    open={open}
                                                    onOpenChange={setOpen}
                                                >
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                className={cn(
                                                                    "w-full justify-between",
                                                                    !field.value &&
                                                                        "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value
                                                                    ? sites.find(
                                                                          (
                                                                              site
                                                                          ) =>
                                                                              site.siteId ===
                                                                              field.value
                                                                      )?.name
                                                                    : "Select site"}
                                                                <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-full p-0">
                                                        <Command>
                                                            <CommandInput placeholder="Search sites" />
                                                            <CommandEmpty>
                                                                No sites found.
                                                            </CommandEmpty>
                                                            <CommandGroup>
                                                                {sites.map(
                                                                    (site) => (
                                                                        <CommandItem
                                                                            value={`${site.name}:${site.siteId}`}
                                                                            key={
                                                                                site.siteId
                                                                            }
                                                                            onSelect={() => {
                                                                                transferForm.setValue(
                                                                                    "siteId",
                                                                                    site.siteId
                                                                                );
                                                                                setOpen(
                                                                                    false
                                                                                );
                                                                            }}
                                                                        >
                                                                            {
                                                                                site.name
                                                                            }
                                                                            <CheckIcon
                                                                                className={cn(
                                                                                    "ml-auto h-4 w-4",
                                                                                    site.siteId ===
                                                                                        field.value
                                                                                        ? "opacity-100"
                                                                                        : "opacity-0"
                                                                                )}
                                                                            />
                                                                        </CommandItem>
                                                                    )
                                                                )}
                                                            </CommandGroup>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </form>
                            </Form>
                        </SettingsSectionForm>
                    </SettingsSectionBody>

                    <SettingsSectionFooter>
                        <Button
                            type="submit"
                            loading={transferLoading}
                            disabled={transferLoading}
                            form="transfer-form"
                        >
                            Transfer Resource
                        </Button>
                    </SettingsSectionFooter>
                </SettingsSection>
            </SettingsContainer>
        )
    );
}
