"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn, formatAxiosError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { Input } from "@/components/ui/input";
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
import { useResourceContext } from "@app/hooks/useResourceContext";
import { ListSitesResponse } from "@server/routers/site";
import { useEffect, useState } from "react";
import { AxiosResponse } from "axios";
import api from "@app/api";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { GetResourceAuthInfoResponse } from "@server/routers/resource";
import { useToast } from "@app/hooks/useToast";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";
import { useOrgContext } from "@app/hooks/useOrgContext";
import CustomDomainInput from "../components/CustomDomainInput";
import ResourceInfoBox from "../components/ResourceInfoBox";
import { subdomainSchema } from "@server/schemas/subdomainSchema";

const GeneralFormSchema = z.object({
    name: z.string(),
    subdomain: subdomainSchema,
    // siteId: z.number(),
});

type GeneralFormValues = z.infer<typeof GeneralFormSchema>;

export default function GeneralForm() {
    const params = useParams();
    const { toast } = useToast();
    const { resource, updateResource } = useResourceContext();
    const { org } = useOrgContext();

    const orgId = params.orgId;

    const [sites, setSites] = useState<ListSitesResponse["sites"]>([]);
    const [saveLoading, setSaveLoading] = useState(false);
    const [domainSuffix, setDomainSuffix] = useState(org.org.domain);

    const form = useForm<GeneralFormValues>({
        resolver: zodResolver(GeneralFormSchema),
        defaultValues: {
            name: resource.name,
            subdomain: resource.subdomain,
            // siteId: resource.siteId!,
        },
        mode: "onChange",
    });

    useEffect(() => {
        const fetchSites = async () => {
            const res = await api.get<AxiosResponse<ListSitesResponse>>(
                `/org/${orgId}/sites/`
            );
            setSites(res.data.data.sites);
        };
        fetchSites();
    }, []);

    async function onSubmit(data: GeneralFormValues) {
        setSaveLoading(true);

        api.post<AxiosResponse<GetResourceAuthInfoResponse>>(
            `resource/${resource?.resourceId}`,
            {
                name: data.name,
                subdomain: data.subdomain,
                // siteId: data.siteId,
            }
        )
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Failed to update resource",
                    description: formatAxiosError(
                        e,
                        "An error occurred while updating the resource"
                    ),
                });
            })
            .then(() => {
                toast({
                    title: "Resource updated",
                    description: "The resource has been updated successfully",
                });

                updateResource({ name: data.name, subdomain: data.subdomain });
            })
            .finally(() => setSaveLoading(false));
    }

    return (
        <>
            <div className="lg:max-w-2xl space-y-12">
                <section className="space-y-6">
                    <SettingsSectionTitle
                        title="General Settings"
                        description="Configure the general settings for this resource"
                        size="1xl"
                    />

                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-6"
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
                                        <FormDescription>
                                            This is the display name of the
                                            resource.
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
                                            This is the subdomain that will be
                                            used to access the resource.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {/* <FormField
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
                                                <CommandInput placeholder="Search sites" />
                                                <CommandList>
                                                    <CommandEmpty>
                                                        No sites found.
                                                    </CommandEmpty>
                                                    <CommandGroup>
                                                        {sites.map((site) => (
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
                                                                {site.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormDescription>
                                        This is the site that will be used in
                                        the dashboard.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        /> */}
                            <Button
                                type="submit"
                                loading={saveLoading}
                                disabled={saveLoading}
                            >
                                Save Changes
                            </Button>
                        </form>
                    </Form>
                </section>
            </div>
        </>
    );
}
