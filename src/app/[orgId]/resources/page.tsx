import { internal } from "@app/api";
import { authCookieHeader } from "@app/api/cookies";
import ResourcesTable, { ResourceRow } from "./components/ResourcesTable";
import { AxiosResponse } from "axios";
import { ListResourcesResponse } from "@server/routers/resource";

type ResourcesPageProps = {
    params: Promise<{ orgId: string }>;
};

export default async function Page(props: ResourcesPageProps) {
    const params = await props.params;
    let resources: ListResourcesResponse["resources"] = [];
    try {
        const res = await internal.get<AxiosResponse<ListResourcesResponse>>(
            `/org/${params.orgId}/resources`,
            await authCookieHeader(),
        );
        resources = res.data.data.resources;
    } catch (e) {
        console.error("Error fetching resources", e);
    }

    const resourceRows: ResourceRow[] = resources.map((resource) => {
        return {
            id: resource.resourceId,
            name: resource.name,
            orgId: params.orgId,
            domain: resource.subdomain || "",
            site: resource.siteName || "None",
        };
    });

    return (
        <>
            <div className="space-y-0.5 select-none mb-6">
                <h2 className="text-2xl font-bold tracking-tight">
                    Manage Resources
                </h2>
                <p className="text-muted-foreground">
                    Create secure proxies to your private applications.
                </p>
            </div>

            <ResourcesTable resources={resourceRows} orgId={params.orgId} />
        </>
    );
}
