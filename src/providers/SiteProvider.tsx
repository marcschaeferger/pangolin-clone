"use client";

import { SiteContext } from "@app/contexts/siteContext";
import { GetSiteResponse } from "@server/routers/site/getSite";
import { ReactNode } from "react";

type LandingProviderProps = {
    site: GetSiteResponse;
    children: ReactNode;
};

export function SiteProvider({ site, children }: LandingProviderProps) {
    return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}

export default SiteProvider;
