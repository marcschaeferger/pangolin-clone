import ResourceProvider from "@app/providers/ResourceProvider";
import { internal } from "@app/api";
import { GetResourceResponse } from "@server/routers/resource";
import { AxiosResponse } from "axios";
import { redirect } from "next/navigation";
import { authCookieHeader } from "@app/api/cookies";
import { SidebarSettings } from "@app/components/SidebarSettings";

interface ResourceLayoutProps {
    children: React.ReactNode;
    params: Promise<{ resourceId: number | string; orgId: string }>;
}

export default async function ResourceLayout(props: ResourceLayoutProps) {
    const params = await props.params;

    const { children } = props;

    let resource = null;

    if (params.resourceId !== "create") {
        try {
            const res = await internal.get<AxiosResponse<GetResourceResponse>>(
                `/resource/${params.resourceId}`,
                await authCookieHeader()
            );
            resource = res.data.data;
        } catch {
            redirect(`/${params.orgId}/settings/resources`);
        }
    }

    const sidebarNavItems = [
        {
            title: "General",
            href: `/{orgId}/settings/resources/resourceId`,
        },
        {
            title: "Targets",
            href: `/{orgId}/settings/resources/{resourceId}/targets`,
        },
    ];

    const isCreate = params.resourceId === "create";

    return (
        <>
            <div className="space-y-0.5 select-none mb-6">
                <h2 className="text-2xl font-bold tracking-tight">
                    {isCreate ? "New Resource" : resource?.name + " Settings"}
                </h2>
                <p className="text-muted-foreground">
                    {isCreate
                        ? "Create a new resource"
                        : "Configure the settings on your resource: " +
                              resource?.name || ""}
                    .
                </p>
            </div>

            <ResourceProvider resource={resource}>
                <SidebarSettings
                    sidebarNavItems={sidebarNavItems}
                    disabled={isCreate}
                    limitWidth={true}
                >
                    {children}
                </SidebarSettings>
            </ResourceProvider>
        </>
    );
}
