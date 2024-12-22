"use client";

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
import { useToast } from "@app/hooks/useToast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useParams, useRouter } from "next/navigation";
import {
    CreateSiteBody,
    CreateSiteResponse,
    PickSiteDefaultsResponse
} from "@server/routers/site";
import { generateKeypair } from "../[niceId]/components/wireguardConfig";
import CopyTextBox from "@app/components/CopyTextBox";
import { Checkbox } from "@app/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@app/components/ui/select";
import { formatAxiosError } from "@app/lib/utils";
import { createApiClient } from "@app/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { SiteRow } from "./SitesTable";
import { AxiosResponse } from "axios";

const createSiteFormSchema = z.object({
    name: z
        .string()
        .min(2, {
            message: "Name must be at least 2 characters."
        })
        .max(30, {
            message: "Name must not be longer than 30 characters."
        }),
    method: z.enum(["wireguard", "newt"])
});

type CreateSiteFormValues = z.infer<typeof createSiteFormSchema>;

const defaultValues: Partial<CreateSiteFormValues> = {
    name: "",
    method: "newt"
};

type CreateSiteFormProps = {
    onCreate?: (site: SiteRow) => void;
    setLoading?: (loading: boolean) => void;
    setChecked?: (checked: boolean) => void;
    orgId: string;
};

export default function CreateSiteForm({
    onCreate,
    setLoading,
    setChecked,
    orgId
}: CreateSiteFormProps) {
    const { toast } = useToast();

    const api = createApiClient(useEnvContext());

    const [isLoading, setIsLoading] = useState(false);
    const [isChecked, setIsChecked] = useState(false);

    const router = useRouter();

    const [keypair, setKeypair] = useState<{
        publicKey: string;
        privateKey: string;
    } | null>(null);
    const [siteDefaults, setSiteDefaults] =
        useState<PickSiteDefaultsResponse | null>(null);

    const handleCheckboxChange = (checked: boolean) => {
        setChecked?.(checked);
        setIsChecked(checked);
    };

    const form = useForm<CreateSiteFormValues>({
        resolver: zodResolver(createSiteFormSchema),
        defaultValues
    });

    useEffect(() => {
        if (!open) return;

        // reset all values
        setLoading?.(false);
        setIsLoading(false);
        form.reset();
        setChecked?.(false);
        setKeypair(null);
        setSiteDefaults(null);

        const generatedKeypair = generateKeypair();
        setKeypair(generatedKeypair);

        api.get(`/org/${orgId}/pick-site-defaults`)
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Error picking site defaults",
                    description: formatAxiosError(e)
                });
            })
            .then((res) => {
                if (res && res.status === 200) {
                    setSiteDefaults(res.data.data);
                }
            });
    }, [open]);

    async function onSubmit(data: CreateSiteFormValues) {
        setLoading?.(true);
        setIsLoading(true);
        if (!siteDefaults || !keypair) {
            return;
        }
        let payload: CreateSiteBody = {
            name: data.name,
            subnet: siteDefaults.subnet,
            exitNodeId: siteDefaults.exitNodeId,
            pubKey: keypair.publicKey,
            type: data.method
        };
        if (data.method === "newt") {
            payload.secret = siteDefaults.newtSecret;
            payload.newtId = siteDefaults.newtId;
        }
        const res = await api
            .put<
                AxiosResponse<CreateSiteResponse>
            >(`/org/${orgId}/site/`, payload)
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Error creating site",
                    description: formatAxiosError(e)
                });
            });

        if (res && res.status === 201) {
            const niceId = res.data.data.niceId;
            // navigate to the site page
            // router.push(`/${orgId}/settings/sites/${niceId}`);

            const data = res.data.data;

            onCreate?.({
                name: data.name,
                id: data.siteId,
                nice: data.niceId.toString(),
                mbIn: "0 MB",
                mbOut: "0 MB",
                orgId: orgId as string,
                type: data.type as any,
                online: false
            });
        }

        setLoading?.(false);
        setIsLoading(false);
    }

    const wgConfig =
        keypair && siteDefaults
            ? `[Interface]
Address = ${siteDefaults.subnet}
ListenPort = 51820
PrivateKey = ${keypair.privateKey}

[Peer]
PublicKey = ${siteDefaults.publicKey}
AllowedIPs = ${siteDefaults.address.split("/")[0]}/32
Endpoint = ${siteDefaults.endpoint}:${siteDefaults.listenPort}
PersistentKeepalive = 5`
            : "";

    // am I at http or https?
    let proto = "http:";
    if (typeof window !== "undefined") {
        proto = window.location.protocol;
    }

    const newtConfig = `newt --id ${siteDefaults?.newtId} --secret ${siteDefaults?.newtSecret} --endpoint ${proto}//${siteDefaults?.endpoint}`;

    return (
        <div className="space-y-8">
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-8"
                    id="create-site-form"
                >
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                    <Input
                                        autoComplete="off"
                                        placeholder="Site name"
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>
                                    This is the name that will be displayed for
                                    this site.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="method"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Method</FormLabel>
                                <FormControl>
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select method" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="wireguard">
                                                WireGuard
                                            </SelectItem>
                                            <SelectItem value="newt">
                                                Newt
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormControl>
                                <FormDescription>
                                    This is how you will expose connections.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="w-full">
                        {form.watch("method") === "wireguard" && !isLoading ? (
                            <CopyTextBox text={wgConfig} />
                        ) : form.watch("method") === "wireguard" &&
                          isLoading ? (
                            <p>Loading WireGuard configuration...</p>
                        ) : (
                            <CopyTextBox text={newtConfig} wrapText={false} />
                        )}
                    </div>

                    <span className="text-sm text-muted-foreground">
                        You will only be able to see the configuration once.
                    </span>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="terms"
                            checked={isChecked}
                            onCheckedChange={handleCheckboxChange}
                        />
                        <label
                            htmlFor="terms"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            I have copied the config
                        </label>
                    </div>
                </form>
            </Form>
        </div>
    );
}
