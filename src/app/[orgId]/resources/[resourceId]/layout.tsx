import { Metadata } from "next";
import Image from "next/image";

import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "@/components/sidebar-nav";
import ResourceProvider from "@app/providers/ResourceProvider";
import { internal } from "@app/api";
import { GetResourceResponse } from "@server/routers/resource";
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
    params: Promise<{ resourceId: string; orgId: string }>;
}

export default async function SettingsLayout(props: SettingsLayoutProps) {
    const params = await props.params;

    const {
        children
    } = props;

    let resource = null;

    if (params.resourceId !== "create") {
        try {
            const res = await internal.get<AxiosResponse<GetResourceResponse>>(
                `/resource/${params.resourceId}`,
                await authCookieHeader(),
            );
            resource = res.data.data;
        } catch {
            redirect(`/${params.orgId}/resources`);
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
                    href={`/${params.orgId}/resources`}
                    className="text-primary font-medium"
                >
                </Link>
            </div>

            <ResourceProvider resource={resource}>                
                <ClientLayout
                isCreate={params.resourceId === "create"}
            >
                {children}
            </ClientLayout></ResourceProvider>
        </>
    );
}
