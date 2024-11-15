"use client";

import OrgContext from "@app/contexts/orgContext";
import { GetOrgResponse } from "@server/routers/org";
import { useState } from "react";

interface OrgProviderProps {
    children: React.ReactNode;
    org: GetOrgResponse | null;
}

export function OrgProvider({ children, org: serverOrg }: OrgProviderProps) {
    const [org, setOrg] = useState<GetOrgResponse | null>(serverOrg);

    if (!org) {
        throw new Error("No org provided");
    }

    const updateOrg = (updatedOrg: Partial<GetOrgResponse>) => {
        if (!org) {
            throw new Error("No org to update");
        }

        setOrg((prev) => {
            if (!prev) {
                return prev;
            }

            return {
                ...prev,
                ...updatedOrg,
            };
        });
    };

    return (
        <OrgContext.Provider value={{ org, updateOrg }}>
            {children}
        </OrgContext.Provider>
    );
}

export default OrgProvider;
