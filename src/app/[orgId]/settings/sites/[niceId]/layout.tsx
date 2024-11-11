import SiteProvider from "@app/providers/SiteProvider";
import { internal } from "@app/api";
import { GetSiteResponse } from "@server/routers/site";
import { AxiosResponse } from "axios";
import { redirect } from "next/navigation";
import { authCookieHeader } from "@app/api/cookies";
import { SidebarSettings } from "@app/components/SidebarSettings";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface SettingsLayoutProps {
    children: React.ReactNode;
    params: Promise<{ niceId: string; orgId: string }>;
}

export default async function SettingsLayout(props: SettingsLayoutProps) {
    const params = await props.params;

    const { children } = props;

    let site = null;
    try {
        const res = await internal.get<AxiosResponse<GetSiteResponse>>(
            `/org/${params.orgId}/site/${params.niceId}`,
            await authCookieHeader()
        );
        site = res.data.data;
    } catch {
        redirect(`/${params.orgId}/settings/sites`);
    }

    const sidebarNavItems = [
        {
            title: "General",
            href: "/{orgId}/settings/sites/{niceId}/general",
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
                        <ArrowLeft /> <span>All Sites</span>
                    </div>
                </Link>
            </div>

            <div className="space-y-0.5 select-none mb-6">
                <h2 className="text-2xl font-bold tracking-tight">
                    {site?.name + " Settings"}
                </h2>
                <p className="text-muted-foreground">
                    Configure the settings on your site
                </p>
            </div>

            <SiteProvider site={site}>
                <SidebarSettings
                    sidebarNavItems={sidebarNavItems}
                    limitWidth={true}
                >
                    {children}
                </SidebarSettings>
            </SiteProvider>
        </>
    );
}
