import { internal } from "@app/lib/api";
import { authCookieHeader } from "@app/lib/api/cookies";
import { ListSitesResponse } from "@server/routers/site";
import { AxiosResponse } from "axios";
import SitesTable, { SiteRow } from "./SitesTable";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";
import SitesSplashCard from "./SitesSplashCard";

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

    function formatSize(mb: number, type: string): string {
        if (type === "local") {
            return "-"; // because we are not able to track the data use in a local site right now
        }
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
            mbIn: formatSize(site.megabytesIn || 0, site.type),
            mbOut: formatSize(site.megabytesOut || 0, site.type),
            orgId: params.orgId,
            type: site.type as any,
            online: site.online
        };
    });

    return (
        <>
            {/* <SitesSplashCard /> */}

            <SettingsSectionTitle
                title="Manage Sites"
                description="Allow connectivity to your network through secure tunnels"
            />

            <SitesTable sites={siteRows} orgId={params.orgId} />
        </>
    );
}
