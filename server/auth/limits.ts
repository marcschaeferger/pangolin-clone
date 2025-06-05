import { db } from '@server/db';
import { limitsTable } from '@server/db';
import { and, eq } from 'drizzle-orm';
import createHttpError from 'http-errors';
import HttpCode from '@server/types/HttpCode';

interface CheckLimitOptions {
    orgId: string;
    limitName: string;
    currentValue: number;
    increment?: number;
}

export async function checkOrgLimit({ orgId, limitName, currentValue, increment = 0 }: CheckLimitOptions): Promise<boolean> {
    try {
        const limit = await db.select()
            .from(limitsTable)
            .where(
                and(
                    eq(limitsTable.orgId, orgId),
                    eq(limitsTable.name, limitName)
                )
            )
            .limit(1);

        if (limit.length === 0) {
            throw createHttpError(HttpCode.NOT_FOUND, `Limit "${limitName}" not found for organization`);
        }

        const limitValue = limit[0].value;

        // Check if the current value plus the increment is within the limit
        return (currentValue + increment) <= limitValue;
    } catch (error) {
        if (error instanceof Error) {
            throw createHttpError(HttpCode.INTERNAL_SERVER_ERROR, `Error checking limit: ${error.message}`);
        }
        throw createHttpError(HttpCode.INTERNAL_SERVER_ERROR, 'Unknown error occurred while checking limit');
    }
}
