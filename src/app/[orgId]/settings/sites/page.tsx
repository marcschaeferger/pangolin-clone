import { internal } from "@app/api";
import { authCookieHeader } from "@app/api/cookies";
import { ListSitesResponse } from "@server/routers/site";
import { AxiosResponse } from "axios";
import SitesTable, { SiteRow } from "./components/SitesTable";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";

type SitesPageProps = {
    params: Promise<{ orgId: string }>;
};

export const dynamic = "force-dynamic";

export default async function SitesPage(props: SitesPageProps) {
    const params = await props.params;
    let sites: ListSitesResponse["sites"] = [];
    try {
        const res = await internal.get<AxiosResponse<ListSitesResponse>>(
            `/org/${params.orgId}/sites`,
            await authCookieHeader()
        );
        sites = res.data.data.sites;
    } catch (e) {}

    function formatSize(mb: number): string {
        if (mb >= 1024 * 1024) {
            return `${(mb / (1024 * 1024)).toFixed(2)} TB`;
        } else if (mb >= 1024) {
            return `${(mb / 1024).toFixed(2)} GB`;
        } else {
            return `${mb.toFixed(2)} MB`;
        }
    }

    const siteRows: SiteRow[] = sites.map((site) => {
        return {
            name: site.name,
            id: site.siteId,
            nice: site.niceId.toString(),
            mbIn: formatSize(site.megabytesIn || 0),
            mbOut: formatSize(site.megabytesOut || 0),
            orgId: params.orgId,
            type: site.type as any,
            online: site.online
        };
    });

    return (
        <>
            <SettingsSectionTitle
                title="Manage Sites"
                description="Allow connectivity to your network through secure tunnels"
            />

            <SitesTable sites={siteRows} orgId={params.orgId} />
        </>
    );
}
