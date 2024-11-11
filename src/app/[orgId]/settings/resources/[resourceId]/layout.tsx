import ResourceProvider from "@app/providers/ResourceProvider";
import { internal } from "@app/api";
import { GetResourceResponse } from "@server/routers/resource";
import { AxiosResponse } from "axios";
import { redirect } from "next/navigation";
import { authCookieHeader } from "@app/api/cookies";
import { SidebarSettings } from "@app/components/SidebarSettings";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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
            title: "Targets",
            href: `/{orgId}/settings/resources/{resourceId}/targets`,
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
                        <ArrowLeft /> <span>All Resources</span>
                    </div>
                </Link>
            </div>

            <div className="space-y-0.5 select-none mb-6">
                <h2 className="text-2xl font-bold tracking-tight">
                    {resource?.name + " Settings"}
                </h2>
                <p className="text-muted-foreground">
                    Configure the settings on your resource
                </p>
            </div>

            <ResourceProvider resource={resource}>
                <SidebarSettings
                    sidebarNavItems={sidebarNavItems}
                    limitWidth={true}
                >
                    {children}
                </SidebarSettings>
            </ResourceProvider>
        </>
    );
}
