import SiteProvider from "@app/providers/SiteProvider";
import { internal } from "@app/api";
import { GetSiteResponse } from "@server/routers/site";
import { AxiosResponse } from "axios";
import { redirect } from "next/navigation";
import { authCookieHeader } from "@app/api/cookies";
import { SidebarSettings } from "@app/components/SidebarSettings";

interface SettingsLayoutProps {
    children: React.ReactNode;
    params: Promise<{ niceId: string; orgId: string }>;
}

export default async function SettingsLayout(props: SettingsLayoutProps) {
    const params = await props.params;

    const { children } = props;

    let site = null;

    if (params.niceId !== "create") {
        try {
            const res = await internal.get<AxiosResponse<GetSiteResponse>>(
                `/org/${params.orgId}/site/${params.niceId}`,
                await authCookieHeader()
            );
            site = res.data.data;
        } catch {
            redirect(`/${params.orgId}/settings/sites`);
        }
    }

    const sidebarNavItems = [
        {
            title: "General",
            href: "/{orgId}/settings/sites/{niceId}",
        },
    ];

    const isCreate = params.niceId === "create";

    return (
        <>
            <div className="space-y-0.5 select-none mb-6">
                <h2 className="text-2xl font-bold tracking-tight">
                    {isCreate ? "New Site" : site?.name + " Settings"}
                </h2>
                <p className="text-muted-foreground">
                    {isCreate
                        ? "Create a new site"
                        : "Configure the settings on your site: " +
                              site?.name || ""}
                    .
                </p>
            </div>

            <SidebarSettings
                sidebarNavItems={sidebarNavItems}
                disabled={isCreate}
                limitWidth={true}
            >
                {children}
            </SidebarSettings>
        </>
    );
}
