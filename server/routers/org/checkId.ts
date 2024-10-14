import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { orgs } from '@server/db/schema';
import { eq } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import logger from '@server/logger';

const getOrgSchema = z.object({
    orgId: z.string()
});

export async function checkId(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        const parsedQuery = getOrgSchema.safeParse(req.query);
        if (!parsedQuery.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedQuery.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { orgId } = parsedQuery.data;

        const org = await db.select()
            .from(orgs)
            .where(eq(orgs.orgId, orgId))
            .limit(1);

        if (org.length > 0) {
            return response(res, {
                data: {},
                success: true,
                error: false,
                message: "Organization ID already exists",
                status: HttpCode.OK,
            });
        }

        return response(res, {
            data: {},
            success: true,
            error: false,
            message: "Organization ID is available",
            status: HttpCode.NOT_FOUND,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}
