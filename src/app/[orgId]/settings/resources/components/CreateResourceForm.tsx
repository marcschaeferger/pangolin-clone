"use client";

import api from "@app/api";
import { Button, buttonVariants } from "@app/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@app/components/ui/form";
import { Input } from "@app/components/ui/input";
import { useToast } from "@app/hooks/useToast";
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
    CredenzaTitle,
} from "@app/components/Credenza";
import { useParams, useRouter } from "next/navigation";
import { ListSitesResponse } from "@server/routers/site";
import { cn, formatAxiosError } from "@app/lib/utils";
import { CheckIcon } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@app/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@app/components/ui/command";
import { CaretSortIcon } from "@radix-ui/react-icons";
import CustomDomainInput from "../[resourceId]/components/CustomDomainInput";
import { Axios, AxiosResponse } from "axios";
import { Resource } from "@server/db/schema";
import { useOrgContext } from "@app/hooks/useOrgContext";
import { subdomainSchema } from "@server/schemas/subdomainSchema";

const accountFormSchema = z.object({
    subdomain: subdomainSchema,
    name: z.string(),
    siteId: z.number(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

const defaultValues: Partial<AccountFormValues> = {
    subdomain: "",
    name: "My Resource",
};

type CreateResourceFormProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
};

export default function CreateResourceForm({
    open,
    setOpen,
}: CreateResourceFormProps) {
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const params = useParams();

    const orgId = params.orgId;
    const router = useRouter();

    const { org } = useOrgContext();

    const [sites, setSites] = useState<ListSitesResponse["sites"]>([]);
    const [domainSuffix, setDomainSuffix] = useState<string>(org.org.domain);

    const form = useForm<AccountFormValues>({
        resolver: zodResolver(accountFormSchema),
        defaultValues,
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        const fetchSites = async () => {
            const res = await api.get<AxiosResponse<ListSitesResponse>>(
                `/org/${orgId}/sites/`
            );
            setSites(res.data.data.sites);
        };

        fetchSites();
    }, [open]);

    async function onSubmit(data: AccountFormValues) {
        console.log(data);

        const res = await api
            .put<AxiosResponse<Resource>>(
                `/org/${orgId}/site/${data.siteId}/resource/`,
                {
                    name: data.name,
                    subdomain: data.subdomain,
                    // subdomain: data.subdomain,
                }
            )
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Error creating resource",
                    description: formatAxiosError(
                        e,
                        "An error occurred when creating the resource"
                    ),
                });
            });

        if (res && res.status === 201) {
            const id = res.data.data.resourceId;
            // navigate to the resource page
            router.push(`/${orgId}/settings/resources/${id}`);
        }
    }

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
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4"
                                id="create-resource-form"
                            >
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Your name"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                This is the name that will be
                                                displayed for this resource.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="subdomain"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Subdomain</FormLabel>
                                            <FormControl>
                                                <CustomDomainInput
                                                    value={field.value}
                                                    domainSuffix={domainSuffix}
                                                    placeholder="Enter subdomain"
                                                    onChange={(value) =>
                                                        form.setValue(
                                                            "subdomain",
                                                            value
                                                        )
                                                    }
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                This is the fully qualified
                                                domain name that will be used to
                                                access the resource.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="siteId"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Site</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            className={cn(
                                                                "w-[350px] justify-between",
                                                                !field.value &&
                                                                    "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value
                                                                ? sites.find(
                                                                      (site) =>
                                                                          site.siteId ===
                                                                          field.value
                                                                  )?.name
                                                                : "Select site"}
                                                            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[350px] p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Search site..." />
                                                        <CommandList>
                                                            <CommandEmpty>
                                                                No site found.
                                                            </CommandEmpty>
                                                            <CommandGroup>
                                                                {sites.map(
                                                                    (site) => (
                                                                        <CommandItem
                                                                            value={
                                                                                site.name
                                                                            }
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
                                            <FormDescription>
                                                This is the site that will be
                                                used in the dashboard.
                                            </FormDescription>
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
                            form="create-resource-form"
                            loading={loading}
                            disabled={loading}
                        >
                            Create Resource
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
