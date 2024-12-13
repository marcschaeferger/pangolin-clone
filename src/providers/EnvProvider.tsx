"use client";

import EnvContext from "@app/contexts/envContext";
import { env } from "@app/lib/types/env";

interface ApiProviderProps {
    children: React.ReactNode;
    env: env;
}

export function EnvProvider({ children, env }: ApiProviderProps) {
    return (
        <EnvContext.Provider value={{ env }}>{children}</EnvContext.Provider>
    );
}

export default EnvProvider;
