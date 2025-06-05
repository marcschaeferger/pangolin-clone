import "./extendZod.ts";

import { runSetupFunctions } from "./setup";
import { createApiServer } from "./apiServer";
import { createNextServer } from "./nextServer";
import { createInternalServer } from "./internalServer";
import { ApiKey, ApiKeyOrg, Session, User, UserOrg } from "@server/db";
import { createIntegrationApiServer } from "./integrationApiServer";
import config from "@server/lib/config";

async function startServers() {
    await runSetupFunctions();

    // Start all servers
    const apiServer = createApiServer();
    const internalServer = createInternalServer();
    const nextServer = await createNextServer();

    let integrationServer;
    if (config.getRawConfig().flags?.enable_integration_api) {
        integrationServer = createIntegrationApiServer();
    }

    return {
        apiServer,
        nextServer,
        internalServer,
        integrationServer
    };
}

// Types
declare global {
    namespace Express {
        interface Request {
            apiKey?: ApiKey;
            user?: User;
            session?: Session;
            userOrg?: UserOrg;
            apiKeyOrg?: ApiKeyOrg;
            userOrgRoleId?: number;
            userOrgId?: string;
            userOrgIds?: string[];
        }
    }
}

startServers().catch(console.error);
