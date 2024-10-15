import { internal } from "@app/api";
import { authCookieHeader } from "@app/api/cookies";
import { ListSitesResponse } from "@server/routers/site";
import { AxiosResponse } from "axios";

type SitesPageProps = {
    params: { orgId: string };
};

export default async function Page({ params }: SitesPageProps) {
    let sites: ListSitesResponse["sites"] = [];
    try {
        const res = await internal.get<AxiosResponse<ListSitesResponse>>(
            `/org/${params.orgId}/sites`,
            authCookieHeader(),
        );
        sites = res.data.data.sites;
    } catch (e) {
    }

    return (
        <>
            <div className="space-y-0.5 select-none">
                <h2 className="text-2xl font-bold tracking-tight">
                    Manage Sites
                </h2>
                <p className="text-muted-foreground">
                    Manage your existing sites here or create a new one.
                </p>
            </div>
        </>
    );
}
