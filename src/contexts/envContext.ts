import { env } from "@app/lib/types/env";
import { createContext } from "react";

interface EnvContextType {
    env: env;
}

const EnvContext = createContext<EnvContextType | undefined>(undefined);

export default EnvContext;
