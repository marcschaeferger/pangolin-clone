"use client";

import { Button, buttonVariants } from "@app/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@app/components/ui/form";
import { Input } from "@app/components/ui/input";
import { toast } from "@app/hooks/useToast";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { useParams, useRouter } from "next/navigation";
import { ListSitesResponse } from "@server/routers/site";
import { formatAxiosError } from "@app/lib/api";
import { CheckIcon } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@app/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@app/components/ui/command";
import { CaretSortIcon } from "@radix-ui/react-icons";
import CustomDomainInput from "./[resourceId]/CustomDomainInput";
import { AxiosResponse } from "axios";
import { Resource } from "@server/db/schema";
import { useOrgContext } from "@app/hooks/useOrgContext";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { cn } from "@app/lib/cn";
import { Switch } from "@app/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@app/components/ui/select";
import { subdomainSchema } from "@server/lib/schemas";
import Link from "next/link";
import { SquareArrowOutUpRight } from "lucide-react";
import CopyTextBox from "@app/components/CopyTextBox";
import { RadioGroup, RadioGroupItem } from "@app/components/ui/radio-group";
import { Label } from "@app/components/ui/label";
import { ListDomainsResponse } from "@server/routers/domain";
import LoaderPlaceholder from "@app/components/PlaceHolderLoader";
import { StrategySelect } from "@app/components/StrategySelect";

const createResourceFormSchema = z
    .object({
        subdomain: z.string().optional(),
        domainId: z.string().min(1).optional(),
        name: z.string().min(1).max(255),
        siteId: z.number(),
        http: z.boolean(),
        protocol: z.string(),
        proxyPort: z.number().optional(),
        isBaseDomain: z.boolean().optional()
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

type CreateResourceFormValues = z.infer<typeof createResourceFormSchema>;

type CreateResourceFormProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
};

export default function CreateResourceForm({
    open,
    setOpen
}: CreateResourceFormProps) {
    const [formKey, setFormKey] = useState(0);
    const api = createApiClient(useEnvContext());

    const [loading, setLoading] = useState(false);
    const params = useParams();

    const orgId = params.orgId;
    const router = useRouter();

    const { org } = useOrgContext();
    const { env } = useEnvContext();

    const [sites, setSites] = useState<ListSitesResponse["sites"]>([]);
    const [baseDomains, setBaseDomains] = useState<
        { domainId: string; baseDomain: string }[]
    >([]);
    const [showSnippets, setShowSnippets] = useState(false);
    const [resourceId, setResourceId] = useState<number | null>(null);
    const [domainType, setDomainType] = useState<"subdomain" | "basedomain">(
        "subdomain"
    );
    const [loadingPage, setLoadingPage] = useState(true);

    const form = useForm<CreateResourceFormValues>({
        resolver: zodResolver(createResourceFormSchema),
        defaultValues: {
            subdomain: "",
            domainId: "",
            name: "",
            http: true,
            protocol: "tcp"
        }
    });

    function reset() {
        form.reset();
        setSites([]);
        setShowSnippets(false);
        setResourceId(null);
    }

    useEffect(() => {
        if (!open) {
            return;
        }

        reset();

        const fetchSites = async () => {
            const res = await api
                .get<AxiosResponse<ListSitesResponse>>(`/org/${orgId}/sites/`)
                .catch((e) => {
                    toast({
                        variant: "destructive",
                        title: "Error fetching sites",
                        description: formatAxiosError(
                            e,
                            "An error occurred when fetching the sites"
                        )
                    });
                });

            if (res?.status === 200) {
                setSites(res.data.data.sites);

                if (res.data.data.sites.length > 0) {
                    form.setValue("siteId", res.data.data.sites[0].siteId);
                }
            }
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
                if (domains.length) {
                    form.setValue("domainId", domains[0].domainId);
                    setFormKey((k) => k + 1);
                }
            }
        };

        const load = async () => {
            setLoadingPage(true);

            await fetchSites();
            await fetchDomains();
            await new Promise((r) => setTimeout(r, 200));

            setLoadingPage(false);
        };

        load();
    }, [open]);

    async function onSubmit(data: CreateResourceFormValues) {
        const res = await api
            .put<AxiosResponse<Resource>>(
                `/org/${orgId}/site/${data.siteId}/resource/`,
                {
                    name: data.name,
                    subdomain: data.http ? data.subdomain : undefined,
                    domainId: data.http ? data.domainId : undefined,
                    http: data.http,
                    protocol: data.protocol,
                    proxyPort: data.http ? undefined : data.proxyPort,
                    siteId: data.siteId,
                    isBaseDomain: data.http ? data.isBaseDomain : undefined
                }
            )
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Error creating resource",
                    description: formatAxiosError(
                        e,
                        "An error occurred when creating the resource"
                    )
                });
            });

        if (res && res.status === 201) {
            const id = res.data.data.resourceId;
            setResourceId(id);

            if (data.http) {
                goToResource(id);
            } else {
                setShowSnippets(true);
                router.refresh();
            }
        }
    }

    function goToResource(id?: number) {
        // navigate to the resource page
        router.push(`/${orgId}/settings/resources/${id || resourceId}`);
    }

    const launchOptions = [
        {
            id: "http",
            title: "HTTPS Resource",
            description:
                "Proxy requests to your app over HTTPS using a subdomain or base domain."
        },
        {
            id: "raw",
            title: "Raw TCP/UDP Resource",
            description:
                "Proxy requests to your app over TCP/UDP using a port number."
        }
    ];

    return (
        <>
            <Credenza
                open={open}
                onOpenChange={(val) => {
                    setOpen(val);
                    setLoading(false);

                    // reset all values
                    form.reset();
                }}
            >
                <CredenzaContent>
                    <CredenzaHeader>
                        <CredenzaTitle>Create Resource</CredenzaTitle>
                        <CredenzaDescription>
                            Create a new resource to proxy requests to your app
                        </CredenzaDescription>
                    </CredenzaHeader>
                    <CredenzaBody>
                        {loadingPage ? (
                            <LoaderPlaceholder height="300px" />
                        ) : (
                            <div>
                                {!showSnippets && (
                                    <Form {...form} key={formKey}>
                                        <form
                                            onSubmit={form.handleSubmit(
                                                onSubmit
                                            )}
                                            className="space-y-4"
                                            id="create-resource-form"
                                        >
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Name
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="siteId"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col">
                                                        <FormLabel>
                                                            Site
                                                        </FormLabel>
                                                        <Popover>
                                                            <PopoverTrigger
                                                                asChild
                                                            >
                                                                <FormControl>
                                                                    <Button
                                                                        variant="outline"
                                                                        role="combobox"
                                                                        className={cn(
                                                                            "justify-between",
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
                                                                              )
                                                                                  ?.name
                                                                            : "Select site"}
                                                                        <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                    </Button>
                                                                </FormControl>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="p-0">
                                                                <Command>
                                                                    <CommandInput placeholder="Search site" />
                                                                    <CommandList>
                                                                        <CommandEmpty>
                                                                            No
                                                                            site
                                                                            found.
                                                                        </CommandEmpty>
                                                                        <CommandGroup>
                                                                            {sites.map(
                                                                                (
                                                                                    site
                                                                                ) => (
                                                                                    <CommandItem
                                                                                        value={`${site.siteId}:${site.name}:${site.niceId}`}
                                                                                        key={
                                                                                            site.siteId
                                                                                        }
                                                                                        onSelect={() => {
                                                                                            form.setValue(
                                                                                                "siteId",
                                                                                                site.siteId
                                                                                            );
                                                                                        }}
                                                                                    >
                                                                                        <CheckIcon
                                                                                            className={cn(
                                                                                                "mr-2 h-4 w-4",
                                                                                                site.siteId ===
                                                                                                    field.value
                                                                                                    ? "opacity-100"
                                                                                                    : "opacity-0"
                                                                                            )}
                                                                                        />
                                                                                        {
                                                                                            site.name
                                                                                        }
                                                                                    </CommandItem>
                                                                                )
                                                                            )}
                                                                        </CommandGroup>
                                                                    </CommandList>
                                                                </Command>
                                                            </PopoverContent>
                                                        </Popover>
                                                        <FormMessage />
                                                        <FormDescription>
                                                            This site will
                                                            provide connectivity
                                                            to the resource.
                                                        </FormDescription>
                                                    </FormItem>
                                                )}
                                            />

                                            {!env.flags.allowRawResources || (
                                                <div className="space-y-2">
                                                    <FormLabel>
                                                        Resource Type
                                                    </FormLabel>
                                                    <StrategySelect
                                                        options={launchOptions}
                                                        defaultValue="http"
                                                        onChange={(value) =>
                                                            form.setValue(
                                                                "http",
                                                                value === "http"
                                                            )
                                                        }
                                                    />
                                                    <FormDescription>
                                                        You cannot change the
                                                        type of resource after
                                                        creation.
                                                    </FormDescription>
                                                </div>
                                            )}

                                            {form.watch("http") &&
                                                env.flags
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

                                            {form.watch("http") && (
                                                <>
                                                    {domainType ===
                                                    "subdomain" ? (
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
                                                                                    value={
                                                                                        field.value
                                                                                    }
                                                                                    defaultValue={
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
                                                            control={
                                                                form.control
                                                            }
                                                            name="domainId"
                                                            render={({
                                                                field
                                                            }) => (
                                                                <FormItem>
                                                                    <FormLabel>
                                                                        Base
                                                                        Domain
                                                                    </FormLabel>
                                                                    <Select
                                                                        onValueChange={
                                                                            field.onChange
                                                                        }
                                                                        defaultValue={
                                                                            field.value
                                                                        }
                                                                        {...field}
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
                                                </>
                                            )}

                                            {!form.watch("http") && (
                                                <>
                                                    <FormField
                                                        control={form.control}
                                                        name="protocol"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Protocol
                                                                </FormLabel>
                                                                <Select
                                                                    value={
                                                                        field.value
                                                                    }
                                                                    onValueChange={
                                                                        field.onChange
                                                                    }
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Select a protocol" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <SelectItem value="tcp">
                                                                            TCP
                                                                        </SelectItem>
                                                                        <SelectItem value="udp">
                                                                            UDP
                                                                        </SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
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
                                                                        onChange={(
                                                                            e
                                                                        ) =>
                                                                            field.onChange(
                                                                                e
                                                                                    .target
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
                                                                <FormDescription>
                                                                    The external
                                                                    port number
                                                                    to proxy
                                                                    requests.
                                                                </FormDescription>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </>
                                            )}
                                        </form>
                                    </Form>
                                )}

                                {showSnippets && (
                                    <div>
                                        <div className="flex items-start space-x-4 mb-6 last:mb-0">
                                            <div className="flex-grow">
                                                <h3 className="text-lg font-semibold mb-3">
                                                    Traefik: Add Entrypoints
                                                </h3>
                                                <CopyTextBox
                                                    text={`entryPoints:
  ${form.getValues("protocol")}-${form.getValues("proxyPort")}:
    address: ":${form.getValues("proxyPort")}/${form.getValues("protocol")}"`}
                                                    wrapText={false}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-start space-x-4 mb-6 last:mb-0">
                                            <div className="flex-grow">
                                                <h3 className="text-lg font-semibold mb-3">
                                                    Gerbil: Expose Ports in
                                                    Docker Compose
                                                </h3>
                                                <CopyTextBox
                                                    text={`ports:
  - ${form.getValues("proxyPort")}:${form.getValues("proxyPort")}${form.getValues("protocol") === "tcp" ? "" : "/" + form.getValues("protocol")}`}
                                                    wrapText={false}
                                                />
                                            </div>
                                        </div>

                                        <Link
                                            className="text-sm text-primary flex items-center gap-1"
                                            href="https://docs.fossorial.io/Pangolin/tcp-udp"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <span>
                                                Learn how to configure TCP/UDP
                                                resources
                                            </span>
                                            <SquareArrowOutUpRight size={14} />
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </CredenzaBody>
                    <CredenzaFooter>
                        <CredenzaClose asChild>
                            <Button variant="outline">Close</Button>
                        </CredenzaClose>
                        {!showSnippets && (
                            <Button
                                type="submit"
                                form="create-resource-form"
                                loading={loading}
                                disabled={loading}
                            >
                                Create Resource
                            </Button>
                        )}

                        {showSnippets && (
                            <Button
                                loading={loading}
                                onClick={() => goToResource()}
                            >
                                Go to Resource
                            </Button>
                        )}
                    </CredenzaFooter>
                </CredenzaContent>
            </Credenza>
        </>
    );
}
