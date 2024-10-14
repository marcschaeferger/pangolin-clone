import { Metadata } from "next"
import Image from "next/image"

import { Separator } from "@/components/ui/separator"
import { SidebarNav } from "@/components/sidebar-nav"
import SiteProvider from "@app/providers/SiteProvider"
import { internal } from "@app/api"
import { cookies } from "next/headers"
import { GetSiteResponse } from "@server/routers/site"
import { AxiosResponse } from "axios"

export const metadata: Metadata = {
    title: "Forms",
    description: "Advanced form example using react-hook-form and Zod.",
}

const sidebarNavItems = [
    {
        title: "Profile",
        href: "/configuration/sites/{siteId}/",
    },
    {
        title: "Account",
        href: "/configuration/sites/{siteId}/account",
    },
    {
        title: "Appearance",
        href: "/configuration/sites/{siteId}/appearance",
    },
    {
        title: "Notifications",
        href: "/configuration/sites/{siteId}/notifications",
    },
    {
        title: "Display",
        href: "/configuration/sites/{siteId}/display",
    },
]

interface SettingsLayoutProps {
    children: React.ReactNode,
    params: { siteId: string }
}

export default async function SettingsLayout({ children, params }: SettingsLayoutProps) {
    const sessionId = cookies().get("session")?.value ?? null;
    const res = await internal
    .get<AxiosResponse<GetSiteResponse>>(`/site/${params.siteId}`,          {
        headers: {
            Cookie: `session=${sessionId}`,
        },
    });

    if (!res || res.status !== 200) {
        return <div>Failed to load site</div>;
    }

    const site = res.data.data;

    return (
        <>
            <div className="md:hidden">
                <Image
                    src="/configuration/forms-light.png"
                    width={1280}
                    height={791}
                    alt="Forms"
                    className="block dark:hidden"
                />
                <Image
                    src="/configuration/forms-dark.png"
                    width={1280}
                    height={791}
                    alt="Forms"
                    className="hidden dark:block"
                />
            </div>
            <div className="hidden space-y-6 p-10 pb-16 md:block">
                <div className="space-y-0.5">
                    <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                    <p className="text-muted-foreground">
                        { params.siteId == "create" ? "Create site..." : "Manage settings on site " + params.siteId }.
                    </p>
                </div>
                <Separator className="my-6" />
                <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                    <aside className="-mx-4 lg:w-1/5">
                        <SidebarNav items={sidebarNavItems.map(i => { i.href = i.href.replace("{siteId}", params.siteId); return i})} disabled={params.siteId == "create"} />
                    </aside>
                    <div className="flex-1 lg:max-w-2xl">
                    <SiteProvider site={site}>
                        {children}
                    </SiteProvider>
                        </div>
                </div>
            </div>
        </>
    )
}
