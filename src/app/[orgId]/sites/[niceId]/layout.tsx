import { Metadata } from "next";
import Image from "next/image";

import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "@/components/sidebar-nav";
import SiteProvider from "@app/providers/SiteProvider";
import { internal } from "@app/api";
import { GetSiteResponse } from "@server/routers/site";
import { AxiosResponse } from "axios";
import { redirect } from "next/navigation";
import { authCookieHeader } from "@app/api/cookies";
import Link from "next/link";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@app/hooks/use-toast";
import { ClientLayout } from "./components/ClientLayout";

export const metadata: Metadata = {
    title: "Forms",
    description: "Advanced form example using react-hook-form and Zod.",
};

interface SettingsLayoutProps {
    children: React.ReactNode;
    params: { niceId: string; orgId: string };
}

export default async function SettingsLayout({
    children,
    params,
}: SettingsLayoutProps) {
    let site = null;

    if (params.niceId !== "create") {
        try {
            const res = await internal.get<AxiosResponse<GetSiteResponse>>(
                `/org/${params.orgId}/site/${params.niceId}`,
                authCookieHeader(),
            );
            site = res.data.data;
        } catch {
            redirect(`/${params.orgId}/sites`);
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

            <div className="mb-4">
                <Link
                    href={`/${params.orgId}/sites`}
                    className="text-primary font-medium"
                >
                </Link>
            </div>

            <SiteProvider site={site}>                
                <ClientLayout
                isCreate={params.niceId === "create"}
            >
                {children}
            </ClientLayout></SiteProvider>
        </>
    );
}
