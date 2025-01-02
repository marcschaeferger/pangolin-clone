import { db } from "@server/db";
import { orgs, resources } from "../db/schema";
import config from "@server/lib/config";
import { eq, ne } from "drizzle-orm";
import logger from "@server/logger";

export async function copyInConfig() {
    // create a url from config.getRawConfig().app.base_url and get the hostname
    const domain = config.getBaseDomain();

    // update the domain on all of the orgs where the domain is not equal to the new domain
    // TODO: eventually each org could have a unique domain that we do not want to overwrite, so this will be unnecessary
    await db.update(orgs).set({ domain }).where(ne(orgs.domain, domain));

    // update all resources fullDomain to use the new domain
    await db.transaction(async (trx) => {
        const allResources = await trx.select().from(resources);

        for (const resource of allResources) {
            const fullDomain = `${resource.subdomain}.${domain}`;
            await trx
                .update(resources)
                .set({ fullDomain })
                .where(eq(resources.resourceId, resource.resourceId));
        }
    });

    logger.info(`Updated orgs with new domain (${domain})`);
}
