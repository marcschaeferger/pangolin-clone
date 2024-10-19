"use client";

import api from "@app/api";
import SiteContext from "@app/contexts/siteContext";
import { toast } from "@app/hooks/use-toast";
import { GetSiteResponse } from "@server/routers/site/getSite";
import { AxiosResponse } from "axios";
import { useState } from "react";

interface SiteProviderProps {
    children: React.ReactNode;
    site: GetSiteResponse | null;
}

export function SiteProvider({ children, site: serverSite }: SiteProviderProps) {
    const [site, setSite] = useState<GetSiteResponse | null>(serverSite);

    const updateSite = async (updatedSite: Partial<GetSiteResponse>) => {
        try {
            if (!site) {
                throw new Error("No site to update");
            }

            const res = await api.post<AxiosResponse<GetSiteResponse>>(
                `site/${site.siteId}`,
                updatedSite,
            );
            setSite(res.data.data);
            toast({
                title: "Site updated!",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Error updating site...",
            })
        }
    };


    return <SiteContext.Provider value={{ site, updateSite }}>{children}</SiteContext.Provider>;
}

export default SiteProvider;