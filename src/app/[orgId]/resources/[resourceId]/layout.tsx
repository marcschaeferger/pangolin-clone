import { Metadata } from "next"
import Image from "next/image"

import { Separator } from "@/components/ui/separator"
import { SidebarNav } from "@/components/sidebar-nav"

// export const metadata: Metadata = {
//     title: "Forms",
//     description: "Advanced form example using react-hook-form and Zod.",
// }

const sidebarNavItems = [
    {
        title: "Profile",
        href: "/{orgId}/resources/{resourceId}",
    },
    {
        title: "Appearance",
        href: "/{orgId}/resources/{resourceId}/appearance",
    },
    {
        title: "Notifications",
        href: "/{orgId}/resources/{resourceId}/notifications",
    },
]

interface SettingsLayoutProps {
    children: React.ReactNode,
    params: { resourceId: string, orgId: string }
}

export default function SettingsLayout({ children, params }: SettingsLayoutProps) {
    return (
        <>
            <div>
                <div className="space-y-0.5">
                    <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                    <p className="text-muted-foreground">
                        Manage your account settings and set e-mail preferences.
                    </p>
                </div>
                <Separator className="my-6" />
                <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                    <aside className="-mx-4 lg:w-1/5">
                        <SidebarNav items={sidebarNavItems.map(i => { i.href = i.href.replace("{resourceId}", params.resourceId).replace("{orgId}", params.orgId); return i})} />
                    </aside>
                    <div className="flex-1 lg:max-w-2xl">{children}</div>
                </div>
            </div>
        </>
    )
}
