import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { sites } from "@server/db";
import { eq, and } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import stoi from "@server/lib/stoi";
import { fromError } from "zod-validation-error";
import { OpenAPITags, registry } from "@server/openApi";

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

registry.registerPath({
    method: "get",
    path: "/org/{orgId}/site/{niceId}",
    description:
        "Get a site by orgId and niceId. NiceId is a readable ID for the site and unique on a per org basis.",
    tags: [OpenAPITags.Org, OpenAPITags.Site],
    request: {
        params: z.object({
            orgId: z.string(),
            niceId: z.string()
        })
    },
    responses: {}
});

registry.registerPath({
    method: "get",
    path: "/site/{siteId}",
    description: "Get a site by siteId.",
    tags: [OpenAPITags.Site],
    request: {
        params: z.object({
            siteId: z.number()
        })
    },
    responses: {}
});

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
