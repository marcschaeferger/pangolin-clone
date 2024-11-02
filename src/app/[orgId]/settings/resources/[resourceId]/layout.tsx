import Image from "next/image";
import ResourceProvider from "@app/providers/ResourceProvider";
import { internal } from "@app/api";
import { GetResourceResponse } from "@server/routers/resource";
import { AxiosResponse } from "axios";
import { redirect } from "next/navigation";
import { authCookieHeader } from "@app/api/cookies";
import Link from "next/link";
import { ClientLayout } from "./components/ClientLayout";

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

    return (
        <>
            <div className="mb-4">
                <Link
                    href={`/${params.orgId}/settings/resources`}
                    className="text-primary font-medium"
                ></Link>
            </div>

            <ResourceProvider resource={resource}>
                <ClientLayout isCreate={params.resourceId === "create"}>
                    {children}
                </ClientLayout>
            </ResourceProvider>
        </>
    );
}
