import { GetOrgResponse } from "@server/routers/org";
import { createContext } from "react";

interface OrgContextType {
    org: GetOrgResponse | null;
    updateOrg: (updateOrg: Partial<GetOrgResponse>) => void;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export default OrgContext;
