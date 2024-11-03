"use client";

import { UserContext } from "@app/contexts/userContext";
import { GetUserResponse } from "@server/routers/user";
import { ReactNode } from "react";

type UserProviderProps = {
    user: GetUserResponse;
    children: ReactNode;
};

export function UserProvider({ user, children }: UserProviderProps) {
    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export default UserProvider;
