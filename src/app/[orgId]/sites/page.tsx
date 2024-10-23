import { internal } from "@app/api";
import { authCookieHeader } from "@app/api/cookies";
import { ListSitesResponse } from "@server/routers/site";
import { AxiosResponse } from "axios";
import SitesTable, { SiteRow } from "./components/SitesTable";

type SitesPageProps = {
    params: Promise<{ orgId: string }>;
};

export default async function Page(props: SitesPageProps) {
    const params = await props.params;
    let sites: ListSitesResponse["sites"] = [];
    try {
        const res = await internal.get<AxiosResponse<ListSitesResponse>>(
            `/org/${params.orgId}/sites`,
            await authCookieHeader(),
        );
        sites = res.data.data.sites;
    } catch (e) {
        console.error("Error fetching sites", e);
    }

    const siteRows: SiteRow[] = sites.map((site) => {
        return {
            name: site.name,
            id: site.siteId,
            nice: site.niceId.toString(),
            mbIn: site.megabytesIn || 0,
            mbOut: site.megabytesOut || 0,
            orgId: params.orgId,
        };
    });

    return (
        <>
            <div className="space-y-0.5 select-none mb-6">
                <h2 className="text-2xl font-bold tracking-tight">
                    Manage Sites
                </h2>
                <p className="text-muted-foreground">
                    Manage your existing sites here or create a new one.
                </p>
            </div>

            <SitesTable sites={siteRows} orgId={params.orgId} />
        </>
    );
}
