import { internal } from "@app/api";
import { authCookieHeader } from "@app/api/cookies";
import { ListSitesResponse } from "@server/routers/site";
import { AxiosResponse } from "axios";
import SitesTable, { SiteRow } from "./components/SitesTable";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";

type SitesPageProps = {
    params: Promise<{ orgId: string }>;
};

export default async function SitesPage(props: SitesPageProps) {
    const params = await props.params;
    let sites: ListSitesResponse["sites"] = [];
    try {
        const res = await internal.get<AxiosResponse<ListSitesResponse>>(
            `/org/${params.orgId}/sites`,
            await authCookieHeader()
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
            <SettingsSectionTitle
                title="Manage Sites"
                description="Manage your existing sites here or create a new one."
            />

            <SitesTable sites={siteRows} orgId={params.orgId} />
        </>
    );
}
