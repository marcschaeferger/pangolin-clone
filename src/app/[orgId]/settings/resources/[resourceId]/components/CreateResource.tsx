"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
    CaretSortIcon,
    CheckIcon,
} from "@radix-ui/react-icons";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Button} from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import React, { useState, useEffect } from "react";
import { api } from "@/api";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ListSitesResponse } from "@server/routers/site";
import { AxiosResponse } from "axios";
import CustomDomainInput from "./CustomDomainInput";

const method = [
    { label: "Wireguard", value: "wg" },
    { label: "Newt", value: "newt" },
] as const;

const accountFormSchema = z.object({
    subdomain: z
        .string()
        .min(2, {
            message: "Name must be at least 2 characters.",
        })
        .max(30, {
            message: "Name must not be longer than 30 characters.",
        }),
    name: z.string(),
    siteId: z.number(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

const defaultValues: Partial<AccountFormValues> = {
    subdomain: "someanimalherefromapi",
    name: "My Resource",
};

export function CreateResourceForm() {
    const params = useParams();
    const orgId = params.orgId;
    const router = useRouter();

    const [sites, setSites] = useState<ListSitesResponse["sites"]>([]);
    const [domainSuffix, setDomainSuffix] = useState<string>(".example.com");

    const form = useForm<AccountFormValues>({
        resolver: zodResolver(accountFormSchema),
        defaultValues,
    });

    useEffect(() => {
        if (typeof window !== "undefined") {
            const fetchSites = async () => {
                const res = await api.get<AxiosResponse<ListSitesResponse>>(
                    `/org/${orgId}/sites/`
                );
                setSites(res.data.data.sites);
            };
            fetchSites();
        }
    }, []);

    async function onSubmit(data: AccountFormValues) {
        console.log(data);

        const res = await api
            .put(`/org/${orgId}/site/${data.siteId}/resource/`, {
                name: data.name,
                subdomain: data.subdomain,
                // subdomain: data.subdomain,
            })
            .catch((e) => {
                toast({
                    title: "Error creating resource...",
                });
            });

        if (res && res.status === 201) {
            const niceId = res.data.data.niceId;
            // navigate to the resource page
            router.push(`/${orgId}/settings/resources/${niceId}`);
        }
    }

    return (
        <>
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-8"
                >
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Your name" {...field} />
                                </FormControl>
                                <FormDescription>
                                    This is the name that will be displayed for
                                    this resource.
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
                                    {/* <Input placeholder="Your name" {...field} /> */}
                                    <CustomDomainInput
                                        {...field}
                                        domainSuffix={domainSuffix}
                                        placeholder="Enter subdomain"
                                    />
                                </FormControl>
                                <FormDescription>
                                    This is the fully qualified domain name that
                                    will be used to access the resource.
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
                                                    {sites.map((site) => (
                                                        <CommandItem
                                                            value={site.name}
                                                            key={site.siteId}
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
                                                            {site.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormDescription>
                                    This is the site that will be used in the
                                    dashboard.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit">Create Resource</Button>
                </form>
            </Form>
        </>
    );
}
