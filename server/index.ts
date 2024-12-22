import { ensureActions } from "./db/ensureActions";
import { createApiServer } from "./apiServer";
import { createNextServer } from "./nextServer";
import { createInternalServer } from "./internalServer";
import { User, UserOrg } from "./db/schema";
import { copyInConfig } from "./setup/copyInConfig";

async function startServers() {
    await ensureActions();
    await copyInConfig();

    // Start all servers
    const apiServer = createApiServer();
    const nextServer = await createNextServer();
    const internalServer = createInternalServer();

    return {
        apiServer,
        nextServer,
        internalServer,
    };
}

// Types
declare global {
    namespace Express {
        interface Request {
            user?: User;
            userOrg?: UserOrg;
            userOrgRoleId?: number;
            userOrgId?: string;
            userOrgIds?: string[];
        }
    }
}

startServers().catch(console.error);
