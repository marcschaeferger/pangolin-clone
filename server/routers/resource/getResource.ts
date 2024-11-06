import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { resources } from "@server/db/schema";
import { eq } from "drizzle-orm";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { fromError } from "zod-validation-error";

const getResourceSchema = z.object({
    resourceId: z.string().transform(Number).pipe(z.number().int().positive()),
});

export type GetResourceResponse = {
    resourceId: number;
    siteId: number;
    orgId: string;
    name: string;
};

export async function getResource(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = getResourceSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { resourceId } = parsedParams.data;

        const resource = await db
            .select()
            .from(resources)
            .where(eq(resources.resourceId, resourceId))
            .limit(1);

        if (resource.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Resource with ID ${resourceId} not found`
                )
            );
        }

        return response(res, {
            data: {
                resourceId: resource[0].resourceId,
                siteId: resource[0].siteId,
                orgId: resource[0].orgId,
                name: resource[0].name,
            },
            success: true,
            error: false,
            message: "Resource retrieved successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
