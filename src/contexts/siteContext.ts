import { GetSiteResponse } from "@server/routers/site/getSite";
import { createContext } from "react";

interface SiteContextType {
    site: GetSiteResponse | null;
    updateSite: (updatedSite: Partial<GetSiteResponse>) => Promise<void>;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export default SiteContext;