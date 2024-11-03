"use client";

import SiteContext from "@app/contexts/siteContext";
import { GetSiteResponse } from "@server/routers/site/getSite";
import { useState } from "react";

interface SiteProviderProps {
    children: React.ReactNode;
    site: GetSiteResponse | null;
}

export function SiteProvider({
    children,
    site: serverSite,
}: SiteProviderProps) {
    const [site, setSite] = useState<GetSiteResponse | null>(serverSite);

    const updateSite = (updatedSite: Partial<GetSiteResponse>) => {
        if (!site) {
            throw new Error("No site to update");
        }
        setSite((prev) => {
            if (!prev) {
                return prev;
            }
            return {
                ...prev,
                ...updatedSite,
            };
        });
    };

    return (
        <SiteContext.Provider value={{ site, updateSite }}>
            {children}
        </SiteContext.Provider>
    );
}

export default SiteProvider;
