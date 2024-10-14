import { SiteContext } from "@app/contexts/siteContext";
import { useContext } from "react";

export function useSiteContext() {
    const site = useContext(SiteContext);
    return site;
}
