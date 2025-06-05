import { join } from "path";
import { readFileSync } from "fs";
import { db } from "@server/db";
import { exitNodes, sites } from "@server/db";
import { eq, and } from "drizzle-orm";
import { __DIRNAME } from "@server/lib/consts";

// Load the names from the names.json file
const dev = process.env.ENVIRONMENT !== "prod";
let file;
if (!dev) {
    file = join(__DIRNAME, "names.json");
} else {
    file = join("server/db/names.json");
}
export const names = JSON.parse(readFileSync(file, "utf-8"));

export async function getUniqueSiteName(orgId: string): Promise<string> {
    let loops = 0;
    while (true) {
        if (loops > 100) {
            throw new Error("Could not generate a unique name");
        }

        const name = generateName();
        const count = await db
            .select({ niceId: sites.niceId, orgId: sites.orgId })
            .from(sites)
            .where(and(eq(sites.niceId, name), eq(sites.orgId, orgId)));
        if (count.length === 0) {
            return name;
        }
        loops++;
    }
}

export async function getUniqueExitNodeEndpointName(): Promise<string> {
    let loops = 0;
    const count = await db
        .select()
        .from(exitNodes);
    while (true) {
        if (loops > 100) {
            throw new Error("Could not generate a unique name");
        }

        const name = generateName();

        for (const node of count) {
            if (node.endpoint.includes(name)) {
                loops++;
                continue;
            }
        }

        return name;
    }
}


export function generateName(): string {
    return (
        names.descriptors[
            Math.floor(Math.random() * names.descriptors.length)
        ] +
        "-" +
        names.animals[Math.floor(Math.random() * names.animals.length)]
    )
        .toLowerCase()
        .replace(/\s/g, "-");
}
