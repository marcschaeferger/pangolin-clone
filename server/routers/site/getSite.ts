import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { sites } from "@server/db/schema";
import { eq, and } from "drizzle-orm";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import stoi from "@server/utils/stoi";
import { fromError } from "zod-validation-error";

const getSiteSchema = z
    .object({
        siteId: z
            .string()
            .optional()
            .transform(stoi)
            .pipe(z.number().int().positive().optional())
            .optional(),
        niceId: z.string().optional(),
        orgId: z.string().optional()
    })
    .strict();

async function query(siteId?: number, niceId?: string, orgId?: string) {
    if (siteId) {
        const [res] = await db
            .select()
            .from(sites)
            .where(eq(sites.siteId, siteId))
            .limit(1);
        return res;
    } else if (niceId && orgId) {
        const [res] = await db
            .select()
            .from(sites)
            .where(and(eq(sites.niceId, niceId), eq(sites.orgId, orgId)))
            .limit(1);
        return res;
    }
}

export type GetSiteResponse = NonNullable<Awaited<ReturnType<typeof query>>>;

export async function getSite(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = getSiteSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { siteId, niceId, orgId } = parsedParams.data;

        const site = await query(siteId, niceId, orgId);

        if (!site) {
            return next(createHttpError(HttpCode.NOT_FOUND, "Site not found"));
        }

        return response<GetSiteResponse>(res, {
            data: site,
            success: true,
            error: false,
            message: "Site retrieved successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
