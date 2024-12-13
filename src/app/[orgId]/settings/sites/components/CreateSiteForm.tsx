"use client";

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
import { useOrgContext } from "@app/hooks/useOrgContext";
import { useParams, useRouter } from "next/navigation";
import { CreateSiteBody, PickSiteDefaultsResponse } from "@server/routers/site";
import { generateKeypair } from "../[niceId]/components/wireguardConfig";
import CopyTextBox from "@app/components/CopyTextBox";
import { Checkbox } from "@app/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@app/components/ui/select";
import { formatAxiosError } from "@app/lib/utils";
import { createApiClient } from "@app/api";
import { useEnvContext } from "@app/hooks/useEnvContext";

const method = [
    { label: "Newt", value: "newt" },
    { label: "Wireguard", value: "wireguard" },
] as const;

const accountFormSchema = z.object({
    name: z
        .string()
        .min(2, {
            message: "Name must be at least 2 characters.",
        })
        .max(30, {
            message: "Name must not be longer than 30 characters.",
        }),
    method: z.enum(["wireguard", "newt"]),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

const defaultValues: Partial<AccountFormValues> = {
    name: "",
    method: "newt",
};

type CreateSiteFormProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
};

export default function CreateSiteForm({ open, setOpen }: CreateSiteFormProps) {
    const { toast } = useToast();

    const api = createApiClient(useEnvContext());

    const [loading, setLoading] = useState(false);

    const params = useParams();
    const orgId = params.orgId;
    const router = useRouter();

    const [keypair, setKeypair] = useState<{
        publicKey: string;
        privateKey: string;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isChecked, setIsChecked] = useState(false);
    const [siteDefaults, setSiteDefaults] =
        useState<PickSiteDefaultsResponse | null>(null);

    const handleCheckboxChange = (checked: boolean) => {
        setIsChecked(checked);
    };

    const form = useForm<AccountFormValues>({
        resolver: zodResolver(accountFormSchema),
        defaultValues,
    });

    useEffect(() => {
        if (!open) return;

        if (typeof window !== "undefined") {
            const generatedKeypair = generateKeypair();
            setKeypair(generatedKeypair);
            setIsLoading(false);

            api.get(`/org/${orgId}/pick-site-defaults`)
                .catch((e) => {
                    toast({
                        variant: "destructive",
                        title: "Error picking site defaults",
                        description: formatAxiosError(e),
                    });
                })
                .then((res) => {
                    if (res && res.status === 200) {
                        setSiteDefaults(res.data.data);
                    }
                });
        }
    }, [open]);

    async function onSubmit(data: AccountFormValues) {
        setLoading(true);
        if (!siteDefaults || !keypair) {
            return;
        }
        let payload: CreateSiteBody = {
            name: data.name,
            subnet: siteDefaults.subnet,
            exitNodeId: siteDefaults.exitNodeId,
            pubKey: keypair.publicKey,
            type: data.method,
        };
        if (data.method === "newt") {
            payload.secret = siteDefaults.newtSecret;
            payload.newtId = siteDefaults.newtId;
        }
        const res = await api
            .put(`/org/${orgId}/site/`, payload)
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Error creating site",
                    description: formatAxiosError(e),
                });
            });

        if (res && res.status === 201) {
            const niceId = res.data.data.niceId;
            // navigate to the site page
            router.push(`/${orgId}/settings/sites/${niceId}`);

            // close the modal
            setOpen(false);
        }

        setLoading(false);
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
        <>
            <Credenza
                open={open}
                onOpenChange={(val) => {
                    setOpen(val);
                    setLoading(false);

                    // reset all values
                    form.reset();
                    setIsChecked(false);
                    setKeypair(null);
                    setSiteDefaults(null);
                }}
            >
                <CredenzaContent>
                    <CredenzaHeader>
                        <CredenzaTitle>Create Site</CredenzaTitle>
                        <CredenzaDescription>
                            Create a new site to start connecting your resources
                        </CredenzaDescription>
                    </CredenzaHeader>
                    <CredenzaBody>
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
                                                    This is the name that will
                                                    be displayed for this site.
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
                                                        onValueChange={
                                                            field.onChange
                                                        }
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
                                                    This is how you will connect
                                                    your site to Fossorial.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="max-w-md">
                                        {form.watch("method") === "wireguard" &&
                                        !isLoading ? (
                                            <CopyTextBox text={wgConfig} />
                                        ) : form.watch("method") === "wireguard" &&
                                          isLoading ? (
                                            <p>
                                                Loading WireGuard
                                                configuration...
                                            </p>
                                        ) : (
                                            <CopyTextBox
                                                text={newtConfig}
                                                wrapText={false}
                                            />
                                        )}
                                    </div>

                                    <span className="text-sm text-muted-foreground">
                                        You will only be able to see the
                                        configuration once.
                                    </span>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="terms"
                                            checked={isChecked}
                                            onCheckedChange={
                                                handleCheckboxChange
                                            }
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
                    </CredenzaBody>
                    <CredenzaFooter>
                        <Button
                            type="submit"
                            form="create-site-form"
                            loading={loading}
                            disabled={loading || !isChecked}
                        >
                            Create Site
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
