"use client";

import { useState, useEffect } from "react";
import { LicenseKeyCache } from "@server/license/license";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { toast } from "@app/hooks/useToast";
import { formatAxiosError } from "@app/lib/api";
import { LicenseKeysDataTable } from "./LicenseKeysDataTable";
import { AxiosResponse } from "axios";
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
import { zodResolver } from "@hookform/resolvers/zod";
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
import { useRouter } from "next/navigation";
import { useLicenseStatusContext } from "@app/hooks/useLicenseStatusContext";
import {
    SettingsContainer,
    SettingsSectionTitle as SSTitle,
    SettingsSection,
    SettingsSectionDescription,
    SettingsSectionGrid,
    SettingsSectionHeader,
    SettingsSectionFooter
} from "@app/components/Settings";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";
import { Badge } from "@app/components/ui/badge";
import { Check, Heart, InfoIcon, ShieldCheck, ShieldOff } from "lucide-react";
import CopyTextBox from "@app/components/CopyTextBox";
import { Progress } from "@app/components/ui/progress";
import { MinusCircle, PlusCircle } from "lucide-react";
import ConfirmDeleteDialog from "@app/components/ConfirmDeleteDialog";
import { SitePriceCalculator } from "./components/SitePriceCalculator";
import Link from "next/link";
import { Checkbox } from "@app/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@app/components/ui/alert";
import { useSupporterStatusContext } from "@app/hooks/useSupporterStatusContext";

const formSchema = z.object({
    licenseKey: z
        .string()
        .nonempty({ message: "License key is required" })
        .max(255),
    agreeToTerms: z.boolean().refine((val) => val === true, {
        message: "You must agree to the license terms"
    })
});

function obfuscateLicenseKey(key: string): string {
    if (key.length <= 8) return key;
    const firstPart = key.substring(0, 4);
    const lastPart = key.substring(key.length - 4);
    return `${firstPart}••••••••••••••••••••${lastPart}`;
}

export default function LicensePage() {
    const api = createApiClient(useEnvContext());
    const [rows, setRows] = useState<LicenseKeyCache[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedLicenseKey, setSelectedLicenseKey] =
        useState<LicenseKeyCache | null>(null);
    const router = useRouter();
    const { licenseStatus, updateLicenseStatus } = useLicenseStatusContext();
    const [hostLicense, setHostLicense] = useState<string | null>(null);
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [purchaseMode, setPurchaseMode] = useState<
        "license" | "additional-sites"
    >("license");

    // Separate loading states for different actions
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isActivatingLicense, setIsActivatingLicense] = useState(false);
    const [isDeletingLicense, setIsDeletingLicense] = useState(false);
    const [isRecheckingLicense, setIsRecheckingLicense] = useState(false);
    const { supporterStatus } = useSupporterStatusContext();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            licenseKey: "",
            agreeToTerms: false
        }
    });

    useEffect(() => {
        async function load() {
            setIsInitialLoading(true);
            await loadLicenseKeys();
            setIsInitialLoading(false);
        }
        load();
    }, []);

    async function loadLicenseKeys() {
        try {
            const response =
                await api.get<AxiosResponse<LicenseKeyCache[]>>(
                    "/license/keys"
                );
            const keys = response.data.data;
            setRows(keys);
            const hostKey = keys.find((key) => key.type === "HOST");
            if (hostKey) {
                setHostLicense(hostKey.licenseKey);
            } else {
                setHostLicense(null);
            }
        } catch (e) {
            toast({
                title: "Failed to load license keys",
                description: formatAxiosError(
                    e,
                    "An error occurred loading license keys"
                )
            });
        }
    }

    async function deleteLicenseKey(key: string) {
        try {
            setIsDeletingLicense(true);
            const encodedKey = encodeURIComponent(key);
            const res = await api.delete(`/license/${encodedKey}`);
            if (res.data.data) {
                updateLicenseStatus(res.data.data);
            }
            await loadLicenseKeys();
            toast({
                title: "License key deleted",
                description: "The license key has been deleted"
            });
            setIsDeleteModalOpen(false);
        } catch (e) {
            toast({
                title: "Failed to delete license key",
                description: formatAxiosError(
                    e,
                    "An error occurred deleting license key"
                )
            });
        } finally {
            setIsDeletingLicense(false);
        }
    }

    async function recheck() {
        try {
            setIsRecheckingLicense(true);
            const res = await api.post(`/license/recheck`);
            if (res.data.data) {
                updateLicenseStatus(res.data.data);
            }
            await loadLicenseKeys();
            toast({
                title: "License keys rechecked",
                description: "All license keys have been rechecked"
            });
        } catch (e) {
            toast({
                title: "Failed to recheck license keys",
                description: formatAxiosError(
                    e,
                    "An error occurred rechecking license keys"
                )
            });
        } finally {
            setIsRecheckingLicense(false);
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            setIsActivatingLicense(true);
            const res = await api.post("/license/activate", {
                licenseKey: values.licenseKey
            });
            if (res.data.data) {
                updateLicenseStatus(res.data.data);
            }

            toast({
                title: "License key activated",
                description: "The license key has been successfully activated."
            });

            setIsCreateModalOpen(false);
            form.reset();
            await loadLicenseKeys();
        } catch (e) {
            toast({
                variant: "destructive",
                title: "Failed to activate license key",
                description: formatAxiosError(
                    e,
                    "An error occurred while activating the license key."
                )
            });
        } finally {
            setIsActivatingLicense(false);
        }
    }

    if (isInitialLoading) {
        return null;
    }

    return (
        <>
            <SitePriceCalculator
                isOpen={isPurchaseModalOpen}
                onOpenChange={(val) => {
                    setIsPurchaseModalOpen(val);
                }}
                mode={purchaseMode}
            />

            <Credenza
                open={isCreateModalOpen}
                onOpenChange={(val) => {
                    setIsCreateModalOpen(val);
                    form.reset();
                }}
            >
                <CredenzaContent>
                    <CredenzaHeader>
                        <CredenzaTitle>Activate License Key</CredenzaTitle>
                        <CredenzaDescription>
                            Enter a license key to activate it.
                        </CredenzaDescription>
                    </CredenzaHeader>
                    <CredenzaBody>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4"
                                id="activate-license-form"
                            >
                                <FormField
                                    control={form.control}
                                    name="licenseKey"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>License Key</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="agreeToTerms"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={
                                                        field.onChange
                                                    }
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    By checking this box, you
                                                    confirm that you have read
                                                    and agree to the license
                                                    terms corresponding to the
                                                    tier associated with your
                                                    license key.
                                                    {/* <br /> */}
                                                    {/* <Link */}
                                                    {/*     href="https://fossorial.io/license.html" */}
                                                    {/*     target="_blank" */}
                                                    {/*     rel="noopener noreferrer" */}
                                                    {/*     className="text-primary hover:underline" */}
                                                    {/* > */}
                                                    {/*     View Fossorial */}
                                                    {/*     Commercial License & */}
                                                    {/*     Subscription Terms */}
                                                    {/* </Link> */}
                                                </FormLabel>
                                                <FormMessage />
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </form>
                        </Form>
                    </CredenzaBody>
                    <CredenzaFooter>
                        <CredenzaClose asChild>
                            <Button variant="outline">Close</Button>
                        </CredenzaClose>
                        <Button
                            type="submit"
                            form="activate-license-form"
                            loading={isActivatingLicense}
                            disabled={isActivatingLicense}
                        >
                            Activate License
                        </Button>
                    </CredenzaFooter>
                </CredenzaContent>
            </Credenza>

            {selectedLicenseKey && (
                <ConfirmDeleteDialog
                    open={isDeleteModalOpen}
                    setOpen={(val) => {
                        setIsDeleteModalOpen(val);
                        setSelectedLicenseKey(null);
                    }}
                    dialog={
                        <div className="space-y-4">
                            <p>
                                Are you sure you want to delete the license key{" "}
                                <b>
                                    {obfuscateLicenseKey(
                                        selectedLicenseKey.licenseKey
                                    )}
                                </b>
                                ?
                            </p>
                            <p>
                                <b>
                                    This will remove the license key and all
                                    associated permissions granted by it.
                                </b>
                            </p>
                            <p>
                                To confirm, please type the license key below.
                            </p>
                        </div>
                    }
                    buttonText="Confirm Delete License Key"
                    onConfirm={async () =>
                        deleteLicenseKey(selectedLicenseKey.licenseKeyEncrypted)
                    }
                    string={selectedLicenseKey.licenseKey}
                    title="Delete License Key"
                />
            )}

            <SettingsSectionTitle
                title="Manage License Status"
                description="View and manage license keys in the system"
            />

            <Alert variant="neutral" className="mb-6">
                <InfoIcon className="h-4 w-4" />
                <AlertTitle className="font-semibold">
                    About Licensing
                </AlertTitle>
                <AlertDescription>
                    This is for business and enterprise users who are using
                    Pangolin in a commercial environment. If you are using
                    Pangolin for personal use, you can ignore this section.
                </AlertDescription>
            </Alert>

            <SettingsContainer>
                <SettingsSectionGrid cols={2}>
                    <SettingsSection>
                        <SettingsSectionHeader>
                            <SSTitle>Host License</SSTitle>
                            <SettingsSectionDescription>
                                Manage the main license key for the host.
                            </SettingsSectionDescription>
                        </SettingsSectionHeader>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-4">
                                {licenseStatus?.isLicenseValid ? (
                                    <div className="space-y-2 text-green-500">
                                        <div className="text-2xl flex items-center gap-2">
                                            <Check />
                                            {licenseStatus?.tier ===
                                            "PROFESSIONAL"
                                                ? "Commercial License"
                                                : licenseStatus?.tier ===
                                                    "ENTERPRISE"
                                                  ? "Commercial License"
                                                  : "Licensed"}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {supporterStatus?.visible ? (
                                            <div className="text-2xl">
                                                Community Edition
                                            </div>
                                        ) : (
                                            <div className="text-2xl flex items-center gap-2 text-pink-500">
                                                <Heart />
                                                Community Edition
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {licenseStatus?.hostId && (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium">
                                        Host ID
                                    </div>
                                    <CopyTextBox text={licenseStatus.hostId} />
                                </div>
                            )}
                            {hostLicense && (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium">
                                        License Key
                                    </div>
                                    <CopyTextBox
                                        text={hostLicense}
                                        displayText={obfuscateLicenseKey(
                                            hostLicense
                                        )}
                                    />
                                </div>
                            )}
                        </div>
                        <SettingsSectionFooter>
                            <Button
                                variant="outline"
                                onClick={recheck}
                                disabled={isRecheckingLicense}
                                loading={isRecheckingLicense}
                            >
                                Recheck All Keys
                            </Button>
                        </SettingsSectionFooter>
                    </SettingsSection>
                    <SettingsSection>
                        <SettingsSectionHeader>
                            <SSTitle>Sites Usage</SSTitle>
                            <SettingsSectionDescription>
                                View the number of sites using this license.
                            </SettingsSectionDescription>
                        </SettingsSectionHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="text-2xl">
                                    {licenseStatus?.usedSites || 0}{" "}
                                    {licenseStatus?.usedSites === 1
                                        ? "site"
                                        : "sites"}{" "}
                                    in system
                                </div>
                            </div>
                            {!licenseStatus?.isHostLicensed && (
                                <p className="text-sm text-muted-foreground">
                                    There is no limit on the number of sites
                                    using an unlicensed host.
                                </p>
                            )}
                            {licenseStatus?.maxSites && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            {licenseStatus.usedSites || 0} of{" "}
                                            {licenseStatus.maxSites} sites used
                                        </span>
                                        <span className="text-muted-foreground">
                                            {Math.round(
                                                ((licenseStatus.usedSites ||
                                                    0) /
                                                    licenseStatus.maxSites) *
                                                    100
                                            )}
                                            %
                                        </span>
                                    </div>
                                    <Progress
                                        value={
                                            ((licenseStatus.usedSites || 0) /
                                                licenseStatus.maxSites) *
                                            100
                                        }
                                        className="h-5"
                                    />
                                </div>
                            )}
                        </div>
                        {/* <SettingsSectionFooter> */}
                        {/*     {!licenseStatus?.isHostLicensed ? ( */}
                        {/*         <> */}
                        {/*             <Button */}
                        {/*                 onClick={() => { */}
                        {/*                     setPurchaseMode("license"); */}
                        {/*                     setIsPurchaseModalOpen(true); */}
                        {/*                 }} */}
                        {/*             > */}
                        {/*                 Purchase License */}
                        {/*             </Button> */}
                        {/*         </> */}
                        {/*     ) : ( */}
                        {/*         <> */}
                        {/*             <Button */}
                        {/*                 variant="outline" */}
                        {/*                 onClick={() => { */}
                        {/*                     setPurchaseMode("additional-sites"); */}
                        {/*                     setIsPurchaseModalOpen(true); */}
                        {/*                 }} */}
                        {/*             > */}
                        {/*                 Purchase Additional Sites */}
                        {/*             </Button> */}
                        {/*         </> */}
                        {/*     )} */}
                        {/* </SettingsSectionFooter> */}
                    </SettingsSection>
                </SettingsSectionGrid>
                <LicenseKeysDataTable
                    licenseKeys={rows}
                    onDelete={(key) => {
                        setSelectedLicenseKey(key);
                        setIsDeleteModalOpen(true);
                    }}
                    onCreate={() => setIsCreateModalOpen(true)}
                />
            </SettingsContainer>
        </>
    );
}
