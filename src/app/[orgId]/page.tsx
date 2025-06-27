import { verifySession } from "@app/lib/auth/verifySession";
import UserProvider from "@app/providers/UserProvider";
import { cache } from "react";
import OrganizationLandingCard from "./OrganizationLandingCard";
import { GetOrgOverviewResponse } from "@server/routers/org/getOrgOverview";
import { internal } from "@app/lib/api";
import { AxiosResponse } from "axios";
import { authCookieHeader } from "@app/lib/api/cookies";
import { redirect } from "next/navigation";
import { Layout } from "@app/components/Layout";
import { orgLangingNavItems, orgMemberNavItems, orgNavItems, rootNavItems } from "../navigation";
import { ListUserOrgsResponse } from "@server/routers/org";

type OrgPageProps = {
    params: Promise<{ orgId: string }>;
};

export default async function OrgPage(props: OrgPageProps) {
    const params = await props.params;
    const orgId = params.orgId;
    
    // Redirect to my-resources page instead of showing overview
    redirect(`/${orgId}/account/my-resources`);
}
