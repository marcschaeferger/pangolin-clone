import ResourceProvider from "@app/providers/ResourceProvider";
import { internal } from "@app/api";
import { GetResourceResponse } from "@server/routers/resource";
import { AxiosResponse } from "axios";
import { redirect } from "next/navigation";
import { authCookieHeader } from "@app/api/cookies";
import { SidebarSettings } from "@app/components/SidebarSettings";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";

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

    const sidebarNavItems = [
        {
            title: "General",
            href: `/{orgId}/settings/resources/{resourceId}/general`,
        },
        {
            title: "Connectivity",
            href: `/{orgId}/settings/resources/{resourceId}/connectivity`,
        },
        {
            title: "Authentication",
            href: `/{orgId}/settings/resources/{resourceId}/authentication`,
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

            <ResourceProvider resource={resource}>
                <SidebarSettings
                    sidebarNavItems={sidebarNavItems}
                    limitWidth={false}
                >
                    {children}
                </SidebarSettings>
            </ResourceProvider>
        </>
    );
}
