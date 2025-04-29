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
import { formatAxiosError } from "@app/lib/api";
import { cn } from "@app/lib/cn";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { ListResourcesResponse } from "@server/routers/resource";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@app/components/ui/popover";
import { CaretSortIcon } from "@radix-ui/react-icons";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@app/components/ui/command";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import { Checkbox } from "@app/components/ui/checkbox";
import { GenerateAccessTokenResponse } from "@server/routers/accessToken";
import { constructShareLink } from "@app/lib/shareLinks";
import { ShareLinkRow } from "./ShareLinksTable";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from "@app/components/ui/collapsible";
import AccessTokenSection from "./AccessTokenUsage";

type FormProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
    onCreated?: (result: ShareLinkRow) => void;
};

const formSchema = z.object({
    resourceId: z.number({ message: "Please select a resource" }),
    resourceName: z.string(),
    resourceUrl: z.string(),
    timeUnit: z.string(),
    timeValue: z.coerce.number().int().positive().min(1),
    title: z.string().optional()
});

export default function CreateShareLinkForm({
    open,
    setOpen,
    onCreated
}: FormProps) {
    const { org } = useOrgContext();

    const { env } = useEnvContext();
    const api = createApiClient({ env });

    const [link, setLink] = useState<string | null>(null);
    const [accessTokenId, setAccessTokenId] = useState<string | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [neverExpire, setNeverExpire] = useState(false);

    const [isOpen, setIsOpen] = useState(false);

    const [resources, setResources] = useState<
        {
            resourceId: number;
            name: string;
            resourceUrl: string;
            siteName: string | null;
        }[]
    >([]);

    const timeUnits = [
        { unit: "minutes", name: "Minutes" },
        { unit: "hours", name: "Hours" },
        { unit: "days", name: "Days" },
        { unit: "weeks", name: "Weeks" },
        { unit: "months", name: "Months" },
        { unit: "years", name: "Years" }
    ];

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            timeUnit: "days",
            timeValue: 30,
            title: ""
        }
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        async function fetchResources() {
            const res = await api
                .get<
                    AxiosResponse<ListResourcesResponse>
                >(`/org/${org?.org.orgId}/resources`)
                .catch((e) => {
                    console.error(e);
                    toast({
                        variant: "destructive",
                        title: "Failed to fetch resources",
                        description: formatAxiosError(
                            e,
                            "An error occurred while fetching the resources"
                        )
                    });
                });

            if (res?.status === 200) {
                setResources(
                    res.data.data.resources
                        .filter((r) => {
                            return r.http;
                        })
                        .map((r) => ({
                            resourceId: r.resourceId,
                            name: r.name,
                            resourceUrl: `${r.ssl ? "https://" : "http://"}${r.fullDomain}/`,
                            siteName: r.siteName
                        }))
                );
            }
        }

        fetchResources();
    }, [open]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);

        // convert time to seconds
        let timeInSeconds = values.timeValue;
        switch (values.timeUnit) {
            case "minutes":
                timeInSeconds *= 60;
                break;
            case "hours":
                timeInSeconds *= 60 * 60;
                break;
            case "days":
                timeInSeconds *= 60 * 60 * 24;
                break;
            case "weeks":
                timeInSeconds *= 60 * 60 * 24 * 7;
                break;
            case "months":
                timeInSeconds *= 60 * 60 * 24 * 30;
                break;
            case "years":
                timeInSeconds *= 60 * 60 * 24 * 365;
                break;
        }

        const res = await api
            .post<AxiosResponse<GenerateAccessTokenResponse>>(
                `/resource/${values.resourceId}/access-token`,
                {
                    validForSeconds: neverExpire ? undefined : timeInSeconds,
                    title:
                        values.title ||
                        `${values.resourceName || "Resource" + values.resourceId} Share Link`
                }
            )
            .catch((e) => {
                console.error(e);
                toast({
                    variant: "destructive",
                    title: "Failed to create share link",
                    description: formatAxiosError(
                        e,
                        "An error occurred while creating the share link"
                    )
                });
            });

        if (res && res.data.data.accessTokenId) {
            const token = res.data.data;
            const link = constructShareLink(token.accessToken);
            setLink(link);

            setAccessToken(token.accessToken);
            setAccessTokenId(token.accessTokenId);

            const resource = resources.find(
                (r) => r.resourceId === values.resourceId
            );

            onCreated?.({
                accessTokenId: token.accessTokenId,
                resourceId: token.resourceId,
                resourceName: values.resourceName,
                title: token.title,
                createdAt: token.createdAt,
                expiresAt: token.expiresAt,
                siteName: resource?.siteName || null
            });
        }

        setLoading(false);
    }

    function getSelectedResourceName(id: number) {
        const resource = resources.find((r) => r.resourceId === id);
        return `${resource?.name} ${resource?.siteName ? `(${resource.siteName})` : ""}`;
    }

    return (
        <>
            <Credenza
                open={open}
                onOpenChange={(val) => {
                    setOpen(val);
                    setLink(null);
                    setLoading(false);
                    form.reset();
                }}
            >
                <CredenzaContent>
                    <CredenzaHeader>
                        <CredenzaTitle>Create Shareable Link</CredenzaTitle>
                        <CredenzaDescription>
                            Anyone with this link can access the resource
                        </CredenzaDescription>
                    </CredenzaHeader>
                    <CredenzaBody>
                        <div className="space-y-4">
                            {!link && (
                                <Form {...form}>
                                    <form
                                        onSubmit={form.handleSubmit(onSubmit)}
                                        className="space-y-4"
                                        id="share-link-form"
                                    >
                                        <FormField
                                            control={form.control}
                                            name="resourceId"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>
                                                        Resource
                                                    </FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
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
                                                                        ? getSelectedResourceName(
                                                                              field.value
                                                                          )
                                                                        : "Select resource"}
                                                                    <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="p-0">
                                                            <Command>
                                                                <CommandInput placeholder="Search resources" />
                                                                <CommandList>
                                                                    <CommandEmpty>
                                                                        No
                                                                        resources
                                                                        found
                                                                    </CommandEmpty>
                                                                    <CommandGroup>
                                                                        {resources.map(
                                                                            (
                                                                                r
                                                                            ) => (
                                                                                <CommandItem
                                                                                    value={`${r.name}:${r.resourceId}`}
                                                                                    key={
                                                                                        r.resourceId
                                                                                    }
                                                                                    onSelect={() => {
                                                                                        form.setValue(
                                                                                            "resourceId",
                                                                                            r.resourceId
                                                                                        );
                                                                                        form.setValue(
                                                                                            "resourceName",
                                                                                            r.name
                                                                                        );
                                                                                        form.setValue(
                                                                                            "resourceUrl",
                                                                                            r.resourceUrl
                                                                                        );
                                                                                    }}
                                                                                >
                                                                                    <CheckIcon
                                                                                        className={cn(
                                                                                            "mr-2 h-4 w-4",
                                                                                            r.resourceId ===
                                                                                                field.value
                                                                                                ? "opacity-100"
                                                                                                : "opacity-0"
                                                                                        )}
                                                                                    />
                                                                                    {`${r.name} ${r.siteName ? `(${r.siteName})` : ""}`}
                                                                                </CommandItem>
                                                                            )
                                                                        )}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="title"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Title (optional)
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <FormLabel>Expire In</FormLabel>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="timeUnit"
                                                        render={({ field }) => (
                                                            <FormItem>
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
                                                                        {timeUnits.map(
                                                                            (
                                                                                option
                                                                            ) => (
                                                                                <SelectItem
                                                                                    key={
                                                                                        option.unit
                                                                                    }
                                                                                    value={
                                                                                        option.unit
                                                                                    }
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

                                                    <FormField
                                                        control={form.control}
                                                        name="timeValue"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input
                                                                        type="number"
                                                                        min={1}
                                                                        {...field}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="terms"
                                                    checked={neverExpire}
                                                    onCheckedChange={(val) =>
                                                        setNeverExpire(
                                                            val as boolean
                                                        )
                                                    }
                                                />
                                                <label
                                                    htmlFor="terms"
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                >
                                                    Never expire
                                                </label>
                                            </div>

                                            <p className="text-sm text-muted-foreground">
                                                Expiration time is how long the
                                                link will be usable and provide
                                                access to the resource. After
                                                this time, the link will no
                                                longer work, and users who used
                                                this link will lose access to
                                                the resource.
                                            </p>
                                        </div>
                                    </form>
                                </Form>
                            )}
                            {link && (
                                <div className="max-w-md space-y-4">
                                    <p>
                                        You will only be able to see this link
                                        once. Make sure to copy it.
                                    </p>
                                    <p>
                                        Anyone with this link can access the
                                        resource. Share it with care.
                                    </p>

                                    <div className="h-[250px] w-full mx-auto flex items-center justify-center">
                                        <QRCodeCanvas value={link} size={200} />
                                    </div>

                                    <Collapsible
                                        open={isOpen}
                                        onOpenChange={setIsOpen}
                                        className="space-y-2"
                                    >
                                        <div className="mx-auto">
                                            <CopyTextBox
                                                text={link}
                                                wrapText={false}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between space-x-4">
                                            <CollapsibleTrigger asChild>
                                                <Button
                                                    variant="text"
                                                    size="sm"
                                                    className="p-0 flex items-center justify-between w-full"
                                                >
                                                    <h4 className="text-sm font-semibold">
                                                        See Access Token Usage
                                                    </h4>
                                                    <div>
                                                        <ChevronsUpDown className="h-4 w-4" />
                                                        <span className="sr-only">
                                                            Toggle
                                                        </span>
                                                    </div>
                                                </Button>
                                            </CollapsibleTrigger>
                                        </div>
                                        <CollapsibleContent className="space-y-2">
                                            {accessTokenId && accessToken && (
                                                <div className="space-y-2">
                                                    <div className="mx-auto">
                                                        <AccessTokenSection
                                                            tokenId={
                                                                accessTokenId
                                                            }
                                                            token={accessToken}
                                                            resourceUrl={form.getValues(
                                                                "resourceUrl"
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </CollapsibleContent>
                                    </Collapsible>
                                </div>
                            )}
                        </div>
                    </CredenzaBody>
                    <CredenzaFooter>
                        <CredenzaClose asChild>
                            <Button variant="outline">Close</Button>
                        </CredenzaClose>
                        <Button
                            type="button"
                            onClick={form.handleSubmit(onSubmit)}
                            loading={loading}
                            disabled={link !== null || loading}
                        >
                            Create Link
                        </Button>
                    </CredenzaFooter>
                </CredenzaContent>
            </Credenza>
        </>
    );
}
