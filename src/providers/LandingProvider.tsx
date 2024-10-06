"use client";

import { UserContext } from "@app/contexts/userContext";
import { ReactNode } from "react";

type LandingProviderProps = {
    user: any;
    children: ReactNode;
};

export function LandingProvider({ user, children }: LandingProviderProps) {
    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export default LandingProvider;
