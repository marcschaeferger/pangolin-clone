import { Metadata } from "next"
import Image from "next/image"

import { Separator } from "@/components/ui/separator"
import { SidebarNav } from "@/components/sidebar-nav"
import SiteProvider from "@app/providers/SiteProvider"
import { internal } from "@app/api"
import { GetSiteResponse } from "@server/routers/site"
import { AxiosResponse } from "axios"
import { redirect } from "next/navigation"
import { authCookieHeader } from "@app/api/cookies"

export const metadata: Metadata = {
    title: "Forms",
    description: "Advanced form example using react-hook-form and Zod.",
}

const sidebarNavItems = [
    {
        title: "Profile",
        href: "/{orgId}/sites/{niceId}",
    },
    {
        title: "Appearance",
        href: "/{orgId}/sites/{niceId}/appearance",
    },
    {
        title: "Notifications",
        href: "/{orgId}/sites/{niceId}/notifications",
    },
    {
        title: "Display",
        href: "/{orgId}/sites/{niceId}/display",
    },
]

interface SettingsLayoutProps {
    children: React.ReactNode,
    params: { niceId: string, orgId: string }
}

export default async function SettingsLayout({ children, params }: SettingsLayoutProps) {
    let site = null;
    if (params.niceId !== "create") {
        try {
            const res = await internal.get<AxiosResponse<GetSiteResponse>>(`/org/${params.orgId}/site/${params.niceId}`, authCookieHeader());
            site = res.data.data;
        } catch {
            redirect(`/${params.orgId}/sites`)
        }
    }

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
            <div className="hidden space-y-6 0 pb-16 md:block">
                <div className="space-y-0.5">
                    <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                    <p className="text-muted-foreground">
                        {params.niceId == "create" ? "Create site..." : "Manage settings on " + site?.name || ""}.
                    </p>
                </div>
                <Separator className="my-6" />
                <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                    <aside className="-mx-4 lg:w-1/5">
                        <SidebarNav items={sidebarNavItems} disabled={params.niceId == "create"} />
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
