import { GetSiteResponse } from "@server/routers/site/getSite";
import { createContext } from "react";

export const SiteContext = createContext<GetSiteResponse | null>(null);
