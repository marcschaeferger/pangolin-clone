import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { db } from '@server/db';
import { sites } from './schema';
import { eq, and } from 'drizzle-orm';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the names from the names.json file
const file = join(__dirname, 'names.json');
export const names = JSON.parse(readFileSync(file, 'utf-8'));

export async function getUniqueName(orgId: string): Promise<string> {
    let loops = 0;
    while (true) {
        if (loops > 100) {
            throw new Error('Could not generate a unique name');
        }

        const name = generateName();
        const count = await db.select({ niceId: sites.niceId, orgId: sites.orgId }).from(sites).where(and(eq(sites.niceId, name), eq(sites.orgId, orgId)));
        if (count.length === 0) {
            return name;
        }
        loops++;
    }
}

export function generateName(): string {
    return (
        names.descriptors[Math.floor(Math.random() * names.descriptors.length)] + "-" +
        names.animals[Math.floor(Math.random() * names.animals.length)]
    ).toLowerCase().replace(/\s/g, '-');
}