import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import {
    resourcePassword,
    resourcePincode,
    resources,
} from "@server/db/schema";
import { eq } from "drizzle-orm";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { fromError } from "zod-validation-error";

const getResourceAuthInfoSchema = z.object({
    resourceId: z.string().transform(Number).pipe(z.number().int().positive()),
});

export type GetResourceAuthInfoResponse = {
    resourceId: number;
    resourceName: string;
    password: boolean;
    pincode: boolean;
    sso: boolean;
    blockAccess: boolean;
};

export async function getResourceAuthInfo(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = getResourceAuthInfoSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { resourceId } = parsedParams.data;

        const [result] = await db
            .select()
            .from(resources)
            .leftJoin(
                resourcePincode,
                eq(resourcePincode.resourceId, resources.resourceId)
            )
            .leftJoin(
                resourcePassword,
                eq(resourcePassword.resourceId, resources.resourceId)
            )
            .where(eq(resources.resourceId, resourceId))
            .limit(1);

        const resource = result?.resources;
        const pincode = result?.resourcePincode;
        const password = result?.resourcePassword;

        if (!resource) {
            return next(
                createHttpError(HttpCode.NOT_FOUND, "Resource not found")
            );
        }

        return response<GetResourceAuthInfoResponse>(res, {
            data: {
                resourceId: resource.resourceId,
                resourceName: resource.name,
                password: password !== null,
                pincode: pincode !== null,
                sso: resource.sso,
                blockAccess: resource.blockAccess,
            },
            success: true,
            error: false,
            message: "Resource auth info retrieved successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
