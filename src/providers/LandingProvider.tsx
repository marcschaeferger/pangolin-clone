"use client";

import { UserContext } from "@app/contexts/userContext";
import { GetUserResponse } from "@server/routers/user";
import { ReactNode } from "react";

type LandingProviderProps = {
    user: GetUserResponse;
    children: ReactNode;
};

export function LandingProvider({ user, children }: LandingProviderProps) {
    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export default LandingProvider;
