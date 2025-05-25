"use client";

import {
    SettingsContainer,
    SettingsSection,
    SettingsSectionBody,
    SettingsSectionDescription,
    SettingsSectionForm,
    SettingsSectionHeader,
    SettingsSectionTitle
} from "@app/components/Settings";
import { StrategySelect } from "@app/components/StrategySelect";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@app/components/ui/form";
import HeaderTitle from "@app/components/SettingsSectionTitle";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@app/components/ui/input";
import { InfoIcon, Terminal } from "lucide-react";
import { Button } from "@app/components/ui/button";
import CopyTextBox from "@app/components/CopyTextBox";
import CopyToClipboard from "@app/components/CopyToClipboard";
import {
    InfoSection,
    InfoSectionContent,
    InfoSections,
    InfoSectionTitle
} from "@app/components/InfoSection";
import {
    FaApple,
    FaCubes,
    FaDocker,
    FaFreebsd,
    FaWindows
} from "react-icons/fa";
import { Checkbox } from "@app/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@app/components/ui/alert";
import { generateKeypair } from "../[niceId]/wireguardConfig";
import { createApiClient, formatAxiosError } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import {
    CreateSiteBody,
    CreateSiteResponse,
    PickSiteDefaultsResponse
} from "@server/routers/site";
import { toast } from "@app/hooks/useToast";
import { AxiosResponse } from "axios";
import { useParams, useRouter } from "next/navigation";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@app/components/ui/breadcrumb";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { useTranslations } from "next-intl";

type SiteType = "newt" | "wireguard" | "local";

interface TunnelTypeOption {
    id: SiteType;
    title: string;
    description: string;
    disabled?: boolean;
}

type Commands = {
    mac: Record<string, string[]>;
    linux: Record<string, string[]>;
    windows: Record<string, string[]>;
    docker: Record<string, string[]>;
    podman: Record<string, string[]>;
};

const platforms = [
    "linux",
    "docker",
    "podman",
    "mac",
    "windows",
    "freebsd"
] as const;

type Platform = (typeof platforms)[number];

export default function Page() {
    const { env } = useEnvContext();
    const api = createApiClient({ env });
    const { orgId } = useParams();
    const router = useRouter();
    const t = useTranslations();

    const createSiteFormSchema = z
        .object({
            name: z
                .string()
                .min(2, { message: t('nameMin', {len: 2}) })
                .max(30, {
                    message: t('nameMax', {len: 30})
                }),
            method: z.enum(["newt", "wireguard", "local"]),
            copied: z.boolean()
        })
        .refine(
            (data) => {
                if (data.method !== "local") {
                    return data.copied;
                }
                return true;
            },
            {
                message: t('sitesConfirmCopy'),
                path: ["copied"]
            }
        );

    type CreateSiteFormValues = z.infer<typeof createSiteFormSchema>;

    const [tunnelTypes, setTunnelTypes] = useState<
        ReadonlyArray<TunnelTypeOption>
    >([
        {
            id: "newt",
            title: t('siteNewtTunnel'),
            description: t('siteNewtTunnelDescription'),
            disabled: true
        },
        {
            id: "wireguard",
            title: t('siteWg'),
            description: t('siteWgDescription'),
            disabled: true
        },
        {
            id: "local",
            title: t('local'),
            description: t('siteLocalDescription')
        }
    ]);

    const [loadingPage, setLoadingPage] = useState(true);

    const [platform, setPlatform] = useState<Platform>("linux");
    const [architecture, setArchitecture] = useState("amd64");
    const [commands, setCommands] = useState<Commands | null>(null);

    const [newtId, setNewtId] = useState("");
    const [newtSecret, setNewtSecret] = useState("");
    const [newtEndpoint, setNewtEndpoint] = useState("");

    const [publicKey, setPublicKey] = useState("");
    const [privateKey, setPrivateKey] = useState("");
    const [wgConfig, setWgConfig] = useState("");

    const [createLoading, setCreateLoading] = useState(false);

    const [siteDefaults, setSiteDefaults] =
        useState<PickSiteDefaultsResponse | null>(null);

    const hydrateWireGuardConfig = (
        privateKey: string,
        publicKey: string,
        subnet: string,
        address: string,
        endpoint: string,
        listenPort: string
    ) => {
        const wgConfig = `[Interface]
Address = ${subnet}
ListenPort = 51820
PrivateKey = ${privateKey}

[Peer]
PublicKey = ${publicKey}
AllowedIPs = ${address.split("/")[0]}/32
Endpoint = ${endpoint}:${listenPort}
PersistentKeepalive = 5`;
        setWgConfig(wgConfig);
    };

    const hydrateCommands = (
        id: string,
        secret: string,
        endpoint: string,
        version: string
    ) => {
        const commands = {
            mac: {
                "Apple Silicon (arm64)": [
                    `curl -L -o newt "https://github.com/fosrl/newt/releases/download/${version}/newt_darwin_arm64" && chmod +x ./newt`,
                    `./newt --id ${id} --secret ${secret} --endpoint ${endpoint}`
                ],
                "Intel x64 (amd64)": [
                    `curl -L -o newt "https://github.com/fosrl/newt/releases/download/${version}/newt_darwin_amd64" && chmod +x ./newt`,
                    `./newt --id ${id} --secret ${secret} --endpoint ${endpoint}`
                ]
            },
            linux: {
                amd64: [
                    `wget -O newt "https://github.com/fosrl/newt/releases/download/${version}/newt_linux_amd64" && chmod +x ./newt`,
                    `./newt --id ${id} --secret ${secret} --endpoint ${endpoint}`
                ],
                arm64: [
                    `wget -O newt "https://github.com/fosrl/newt/releases/download/${version}/newt_linux_arm64" && chmod +x ./newt`,
                    `./newt --id ${id} --secret ${secret} --endpoint ${endpoint}`
                ],
                arm32: [
                    `wget -O newt "https://github.com/fosrl/newt/releases/download/${version}/newt_linux_arm32" && chmod +x ./newt`,
                    `./newt --id ${id} --secret ${secret} --endpoint ${endpoint}`
                ],
                arm32v6: [
                    `wget -O newt "https://github.com/fosrl/newt/releases/download/${version}/newt_linux_arm32v6" && chmod +x ./newt`,
                    `./newt --id ${id} --secret ${secret} --endpoint ${endpoint}`
                ],
                riscv64: [
                    `wget -O newt "https://github.com/fosrl/newt/releases/download/${version}/newt_linux_riscv64" && chmod +x ./newt`,
                    `./newt --id ${id} --secret ${secret} --endpoint ${endpoint}`
                ]
            },
            freebsd: {
                amd64: [
                    `fetch -o newt "https://github.com/fosrl/newt/releases/download/${version}/newt_freebsd_amd64" && chmod +x ./newt`,
                    `./newt --id ${id} --secret ${secret} --endpoint ${endpoint}`
                ],
                arm64: [
                    `fetch -o newt "https://github.com/fosrl/newt/releases/download/${version}/newt_freebsd_arm64" && chmod +x ./newt`,
                    `./newt --id ${id} --secret ${secret} --endpoint ${endpoint}`
                ]
            },
            windows: {
                x64: [
                    `curl -o newt.exe -L "https://github.com/fosrl/newt/releases/download/${version}/newt_windows_amd64.exe"`,
                    `newt.exe --id ${id} --secret ${secret} --endpoint ${endpoint}`
                ]
            },
            docker: {
                "Docker Compose": [
                    `services:
  newt:
    image: fosrl/newt
    container_name: newt
    restart: unless-stopped
    environment:
      - PANGOLIN_ENDPOINT=${endpoint}
      - NEWT_ID=${id}
      - NEWT_SECRET=${secret}`
                ],
                "Docker Run": [
                    `docker run -it fosrl/newt --id ${id} --secret ${secret} --endpoint ${endpoint}`
                ]
            },
            podman: {
                "Podman Quadlet": [
                    `[Unit]
Description=Newt container

[Container]
ContainerName=newt
Image=docker.io/fosrl/newt
Environment=PANGOLIN_ENDPOINT=${endpoint}
Environment=NEWT_ID=${id}
Environment=NEWT_SECRET=${secret}
# Secret=newt-secret,type=env,target=NEWT_SECRET

[Service]
Restart=always

[Install]
WantedBy=default.target`
                ],
                "Podman Run": [
                    `podman run -it docker.io/fosrl/newt --id ${id} --secret ${secret} --endpoint ${endpoint}`
                ]
            }
        };
        setCommands(commands);
    };

    const getArchitectures = () => {
        switch (platform) {
            case "linux":
                return ["amd64", "arm64", "arm32", "arm32v6", "riscv64"];
            case "mac":
                return ["Apple Silicon (arm64)", "Intel x64 (amd64)"];
            case "windows":
                return ["x64"];
            case "docker":
                return ["Docker Compose", "Docker Run"];
            case "podman":
                return ["Podman Quadlet", "Podman Run"];
            case "freebsd":
                return ["amd64", "arm64"];
            default:
                return ["x64"];
        }
    };

    const getPlatformName = (platformName: string) => {
        switch (platformName) {
            case "windows":
                return "Windows";
            case "mac":
                return "macOS";
            case "docker":
                return "Docker";
            case "podman":
                return "Podman";
            case "freebsd":
                return "FreeBSD";
            default:
                return "Linux";
        }
    };

    const getCommand = () => {
        const placeholder = [t('unknownCommand')];
        if (!commands) {
            return placeholder;
        }
        let platformCommands = commands[platform as keyof Commands];

        if (!platformCommands) {
            // get first key
            const firstPlatform = Object.keys(commands)[0] as Platform;
            platformCommands = commands[firstPlatform as keyof Commands];

            setPlatform(firstPlatform);
        }

        let architectureCommands = platformCommands[architecture];
        if (!architectureCommands) {
            // get first key
            const firstArchitecture = Object.keys(platformCommands)[0];
            architectureCommands = platformCommands[firstArchitecture];

            setArchitecture(firstArchitecture);
        }

        return architectureCommands || placeholder;
    };

    const getPlatformIcon = (platformName: string) => {
        switch (platformName) {
            case "windows":
                return <FaWindows className="h-4 w-4 mr-2" />;
            case "mac":
                return <FaApple className="h-4 w-4 mr-2" />;
            case "docker":
                return <FaDocker className="h-4 w-4 mr-2" />;
            case "podman":
                return <FaCubes className="h-4 w-4 mr-2" />;
            case "freebsd":
                return <FaFreebsd className="h-4 w-4 mr-2" />;
            default:
                return <Terminal className="h-4 w-4 mr-2" />;
        }
    };

    const form = useForm<CreateSiteFormValues>({
        resolver: zodResolver(createSiteFormSchema),
        defaultValues: { name: "", copied: false, method: "newt" }
    });

    async function onSubmit(data: CreateSiteFormValues) {
        setCreateLoading(true);

        let payload: CreateSiteBody = { name: data.name, type: data.method };

        if (data.method == "wireguard") {
            if (!siteDefaults || !wgConfig) {
                toast({
                    variant: "destructive",
                    title: t('siteErrorCreate'),
                    description: t('siteErrorCreateKeyPair')
                });
                setCreateLoading(false);
                return;
            }

            payload = {
                ...payload,
                subnet: siteDefaults.subnet,
                exitNodeId: siteDefaults.exitNodeId,
                pubKey: publicKey
            };
        }
        if (data.method === "newt") {
            if (!siteDefaults) {
                toast({
                    variant: "destructive",
                    title: t('siteErrorCreate'),
                    description: t('siteErrorCreateDefaults')
                });
                setCreateLoading(false);
                return;
            }

            payload = {
                ...payload,
                subnet: siteDefaults.subnet,
                exitNodeId: siteDefaults.exitNodeId,
                secret: siteDefaults.newtSecret,
                newtId: siteDefaults.newtId
            };
        }

        const res = await api
            .put<
                AxiosResponse<CreateSiteResponse>
            >(`/org/${orgId}/site/`, payload)
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: t('siteErrorCreate'),
                    description: formatAxiosError(e)
                });
            });

        if (res && res.status === 201) {
            const data = res.data.data;

            router.push(`/${orgId}/settings/sites/${data.niceId}`);
        }

        setCreateLoading(false);
    }

    useEffect(() => {
        const load = async () => {
            setLoadingPage(true);

            let newtVersion = "latest";

            try {
                const response = await fetch(
                    `https://api.github.com/repos/fosrl/newt/releases/latest`
                );
                if (!response.ok) {
                    throw new Error(
                        t('newtErrorFetchReleases', {err: response.statusText})
                    );
                }
                const data = await response.json();
                const latestVersion = data.tag_name;
                newtVersion = latestVersion;
            } catch (error) {
                console.error(t('newtErrorFetchLatest', {err: error instanceof Error ? error.message : String(error)}));
            }

            const generatedKeypair = generateKeypair();

            const privateKey = generatedKeypair.privateKey;
            const publicKey = generatedKeypair.publicKey;

            setPrivateKey(privateKey);
            setPublicKey(publicKey);

            await api
                .get(`/org/${orgId}/pick-site-defaults`)
                .catch((e) => {
                    // update the default value of the form to be local method
                    form.setValue("method", "local");
                })
                .then((res) => {
                    if (res && res.status === 200) {
                        const data = res.data.data;

                        setSiteDefaults(data);

                        const newtId = data.newtId;
                        const newtSecret = data.newtSecret;
                        const newtEndpoint = data.endpoint;

                        setNewtId(newtId);
                        setNewtSecret(newtSecret);
                        setNewtEndpoint(newtEndpoint);

                        hydrateCommands(
                            newtId,
                            newtSecret,
                            env.app.dashboardUrl,
                            newtVersion
                        );

                        hydrateWireGuardConfig(
                            privateKey,
                            data.publicKey,
                            data.subnet,
                            data.address,
                            data.endpoint,
                            data.listenPort
                        );

                        setTunnelTypes((prev: any) => {
                            return prev.map((item: any) => {
                                return { ...item, disabled: false };
                            });
                        });
                    }
                });

            setLoadingPage(false);
        };

        load();
    }, []);

    return (
        <>
            <div className="flex justify-between">
                <HeaderTitle
                    title={t('siteCreate')}
                    description={t('siteCreateDescription2')}
                />
                <Button
                    variant="outline"
                    onClick={() => {
                        router.push(`/${orgId}/settings/sites`);
                    }}
                >
                    {t('siteSeeAll')}
                </Button>
            </div>

            {!loadingPage && (
                <div>
                    <SettingsContainer>
                        <SettingsSection>
                            <SettingsSectionHeader>
                                <SettingsSectionTitle>
                                    {t('siteInfo')}
                                </SettingsSectionTitle>
                            </SettingsSectionHeader>
                            <SettingsSectionBody>
                                <SettingsSectionForm>
                                    <Form {...form}>
                                        <form
                                            className="space-y-4"
                                            id="create-site-form"
                                        >
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            {t('name')}
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                autoComplete="off"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                        <FormDescription>
                                                            {t('siteNameDescription')}
                                                        </FormDescription>
                                                    </FormItem>
                                                )}
                                            />
                                        </form>
                                    </Form>
                                </SettingsSectionForm>
                            </SettingsSectionBody>
                        </SettingsSection>

                        <SettingsSection>
                            <SettingsSectionHeader>
                                <SettingsSectionTitle>
                                    {t('tunnelType')}
                                </SettingsSectionTitle>
                                <SettingsSectionDescription>
                                    {t('siteTunnelDescription')}
                                </SettingsSectionDescription>
                            </SettingsSectionHeader>
                            <SettingsSectionBody>
                                <StrategySelect
                                    options={tunnelTypes}
                                    defaultValue={form.getValues("method")}
                                    onChange={(value) => {
                                        form.setValue("method", value);
                                    }}
                                    cols={3}
                                />
                            </SettingsSectionBody>
                        </SettingsSection>

                        {form.watch("method") === "newt" && (
                            <>
                                <SettingsSection>
                                    <SettingsSectionHeader>
                                        <SettingsSectionTitle>
                                            {t('siteNewtCredentials')}
                                        </SettingsSectionTitle>
                                        <SettingsSectionDescription>
                                            {t('siteNewtCredentialsDescription')}
                                        </SettingsSectionDescription>
                                    </SettingsSectionHeader>
                                    <SettingsSectionBody>
                                        <InfoSections cols={3}>
                                            <InfoSection>
                                                <InfoSectionTitle>
                                                    {t('newtEndpoint')}
                                                </InfoSectionTitle>
                                                <InfoSectionContent>
                                                    <CopyToClipboard
                                                        text={
                                                            env.app.dashboardUrl
                                                        }
                                                    />
                                                </InfoSectionContent>
                                            </InfoSection>
                                            <InfoSection>
                                                <InfoSectionTitle>
                                                    {t('newtId')}
                                                </InfoSectionTitle>
                                                <InfoSectionContent>
                                                    <CopyToClipboard
                                                        text={newtId}
                                                    />
                                                </InfoSectionContent>
                                            </InfoSection>
                                            <InfoSection>
                                                <InfoSectionTitle>
                                                    {t('newtSecretKey')}
                                                </InfoSectionTitle>
                                                <InfoSectionContent>
                                                    <CopyToClipboard
                                                        text={newtSecret}
                                                    />
                                                </InfoSectionContent>
                                            </InfoSection>
                                        </InfoSections>

                                        <Alert variant="neutral" className="">
                                            <InfoIcon className="h-4 w-4" />
                                            <AlertTitle className="font-semibold">
                                                {t('siteCredentialsSave')}
                                            </AlertTitle>
                                            <AlertDescription>
                                                {t('siteCredentialsSaveDescription')}
                                            </AlertDescription>
                                        </Alert>

                                        <Form {...form}>
                                            <form
                                                className="space-y-4"
                                                id="create-site-form"
                                            >
                                                <FormField
                                                    control={form.control}
                                                    name="copied"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <div className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id="terms"
                                                                    defaultChecked={
                                                                        form.getValues(
                                                                            "copied"
                                                                        ) as boolean
                                                                    }
                                                                    onCheckedChange={(
                                                                        e
                                                                    ) => {
                                                                        form.setValue(
                                                                            "copied",
                                                                            e as boolean
                                                                        );
                                                                    }}
                                                                />
                                                                <label
                                                                    htmlFor="terms"
                                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                                >
                                                                    {t('siteConfirmCopy')}
                                                                </label>
                                                            </div>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </form>
                                        </Form>
                                    </SettingsSectionBody>
                                </SettingsSection>

                                <SettingsSection>
                                    <SettingsSectionHeader>
                                        <SettingsSectionTitle>
                                            {t('siteInstallNewt')}
                                        </SettingsSectionTitle>
                                        <SettingsSectionDescription>
                                            {t('siteInstallNewtDescription')}
                                        </SettingsSectionDescription>
                                    </SettingsSectionHeader>
                                    <SettingsSectionBody>
                                        <div>
                                            <p className="font-bold mb-3">
                                                {t('operatingSystem')}
                                            </p>
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                                {platforms.map((os) => (
                                                    <Button
                                                        key={os}
                                                        variant={
                                                            platform === os
                                                                ? "squareOutlinePrimary"
                                                                : "squareOutline"
                                                        }
                                                        className={`flex-1 min-w-[120px] ${platform === os ? "bg-primary/10" : ""}`}
                                                        onClick={() => {
                                                            setPlatform(os);
                                                        }}
                                                    >
                                                        {getPlatformIcon(os)}
                                                        {getPlatformName(os)}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="font-bold mb-3">
                                                {["docker", "podman"].includes(
                                                    platform
                                                )
                                                    ? t('method')
                                                    : t('architecture')}
                                            </p>
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                                {getArchitectures().map(
                                                    (arch) => (
                                                        <Button
                                                            key={arch}
                                                            variant={
                                                                architecture ===
                                                                arch
                                                                    ? "squareOutlinePrimary"
                                                                    : "squareOutline"
                                                            }
                                                            className={`flex-1 min-w-[120px] ${architecture === arch ? "bg-primary/10" : ""}`}
                                                            onClick={() =>
                                                                setArchitecture(
                                                                    arch
                                                                )
                                                            }
                                                        >
                                                            {arch}
                                                        </Button>
                                                    )
                                                )}
                                            </div>
                                            <div className="pt-4">
                                                <p className="font-bold mb-3">
                                                    {t('commands')}
                                                </p>
                                                <div className="mt-2">
                                                    <CopyTextBox
                                                        text={getCommand().join(
                                                            "\n"
                                                        )}
                                                        outline={true}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </SettingsSectionBody>
                                </SettingsSection>
                            </>
                        )}

                        {form.watch("method") === "wireguard" && (
                            <SettingsSection>
                                <SettingsSectionHeader>
                                    <SettingsSectionTitle>
                                        {t('WgConfiguration')}
                                    </SettingsSectionTitle>
                                    <SettingsSectionDescription>
                                        {t('WgConfigurationDescription')}
                                    </SettingsSectionDescription>
                                </SettingsSectionHeader>
                                <SettingsSectionBody>
                                    <div className="flex items-center gap-4">
                                        <CopyTextBox text={wgConfig} />
                                        <div
                                            className={`relative w-fit border rounded-md`}
                                        >
                                            <div className="bg-white p-6 rounded-md">
                                                <QRCodeCanvas
                                                    value={wgConfig}
                                                    size={168}
                                                    className="mx-auto"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <Alert variant="neutral">
                                        <InfoIcon className="h-4 w-4" />
                                        <AlertTitle className="font-semibold">
                                            {t('siteCredentialsSave')}
                                        </AlertTitle>
                                        <AlertDescription>
                                            {t('siteCredentialsSaveDescription')}
                                        </AlertDescription>
                                    </Alert>

                                    <Form {...form}>
                                        <form
                                            className="space-y-4"
                                            id="create-site-form"
                                        >
                                            <FormField
                                                control={form.control}
                                                name="copied"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id="terms"
                                                                defaultChecked={
                                                                    form.getValues(
                                                                        "copied"
                                                                    ) as boolean
                                                                }
                                                                onCheckedChange={(
                                                                    e
                                                                ) => {
                                                                    form.setValue(
                                                                        "copied",
                                                                        e as boolean
                                                                    );
                                                                }}
                                                            />
                                                            <label
                                                                htmlFor="terms"
                                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                            >
                                                                {t('siteConfirmCopy')}
                                                            </label>
                                                        </div>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </form>
                                    </Form>
                                </SettingsSectionBody>
                            </SettingsSection>
                        )}
                    </SettingsContainer>

                    <div className="flex justify-end space-x-2 mt-8">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                router.push(`/${orgId}/settings/sites`);
                            }}
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                form.handleSubmit(onSubmit)();
                            }}
                        >
                            {t('siteCreate')}
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}
