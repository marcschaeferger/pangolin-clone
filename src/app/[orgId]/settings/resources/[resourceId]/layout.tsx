import ResourceProvider from "@app/providers/ResourceProvider";
import { internal } from "@app/api";
import { GetResourceResponse } from "@server/routers/resource";
import { AxiosResponse } from "axios";
import { redirect } from "next/navigation";
import { authCookieHeader } from "@app/api/cookies";
import { SidebarSettings } from "@app/components/SidebarSettings";
import Link from "next/link";
import { ArrowLeft, Cloud, Settings, Shield } from "lucide-react";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";
import { GetOrgResponse } from "@server/routers/org";
import OrgProvider from "@app/providers/OrgProvider";
import { cache } from "react";
import ResourceInfoBox from "./components/ResourceInfoBox";

interface ResourceLayoutProps {
    children: React.ReactNode;
    params: Promise<{ resourceId: number | string; orgId: string }>;
}

export default async function ResourceLayout(props: ResourceLayoutProps) {
    const params = await props.params;

    const { children } = props;

    let resource = null;
    try {
        const res = await internal.get<AxiosResponse<GetResourceResponse>>(
            `/resource/${params.resourceId}`,
            await authCookieHeader()
        );
        resource = res.data.data;
    } catch {
        redirect(`/${params.orgId}/settings/resources`);
    }

    if (!resource) {
        redirect(`/${params.orgId}/settings/resources`);
    }

    let org = null;
    try {
        const getOrg = cache(async () =>
            internal.get<AxiosResponse<GetOrgResponse>>(
                `/org/${params.orgId}`,
                await authCookieHeader()
            )
        );
        const res = await getOrg();
        org = res.data.data;
    } catch {
        redirect(`/${params.orgId}/settings/resources`);
    }

    if (!org) {
        redirect(`/${params.orgId}/settings/resources`);
    }

    const sidebarNavItems = [
        {
            title: "General",
            href: `/{orgId}/settings/resources/{resourceId}/general`,
            icon: <Settings className="w-4 h-4" />,
        },
        {
            title: "Connectivity",
            href: `/{orgId}/settings/resources/{resourceId}/connectivity`,
            icon: <Cloud className="w-4 h-4" />,
        },
        {
            title: "Authentication",
            href: `/{orgId}/settings/resources/{resourceId}/authentication`,
            icon: <Shield className="w-4 h-4" />,
        },
    ];

    return (
        <>
            <div className="mb-4">
                <Link
                    href="../../"
                    className="text-muted-foreground hover:underline"
                >
                    <div className="flex flex-row items-center gap-1">
                        <ArrowLeft className="w-4 h-4" />{" "}
                        <span>All Resources</span>
                    </div>
                </Link>
            </div>

            <SettingsSectionTitle
                title={`${resource?.name} Settings`}
                description="Configure the settings on your resource"
            />

            <OrgProvider org={org}>
                <ResourceProvider resource={resource}>
                    <SidebarSettings
                        sidebarNavItems={sidebarNavItems}
                        limitWidth={false}
                    >
                        <div className="mb-8">
                            <ResourceInfoBox />
                        </div>
                        {children}
                    </SidebarSettings>
                </ResourceProvider>
            </OrgProvider>
        </>
    );
}
