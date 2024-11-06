import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { orgs, userActions } from "@server/db/schema";
import { eq } from "drizzle-orm";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { ActionsEnum, checkUserActionPermission } from "@server/auth/actions";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";

const deleteOrgSchema = z.object({
    orgId: z.string(),
});

export async function deleteOrg(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = deleteOrgSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { orgId } = parsedParams.data;

        // // Check if the user has permission to list sites
        // const hasPermission = await checkUserActionPermission(
        //     ActionsEnum.deleteOrg,
        //     req
        // );
        // if (!hasPermission) {
        //     return next(
        //         createHttpError(
        //             HttpCode.FORBIDDEN,
        //             "User does not have permission to perform this action"
        //         )
        //     );
        // }

        const deletedOrg = await db
            .delete(orgs)
            .where(eq(orgs.orgId, orgId))
            .returning();

        if (deletedOrg.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Organization with ID ${orgId} not found`
                )
            );
        }

        return response(res, {
            data: null,
            success: true,
            error: false,
            message: "Organization deleted successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "An error occurred..."
            )
        );
    }
}
