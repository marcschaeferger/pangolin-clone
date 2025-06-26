import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import createHttpError from "http-errors";
import { db } from "@server/db";
import { orgs } from "@server/db";
import { eq } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import { OpenAPITags, registry } from "@server/openApi";
import { ActionsEnum, checkUserActionPermission } from "@server/auth/actions";
import logger from "@server/logger";

const updateOrgSecurityParamsSchema = z
    .object({
        orgId: z.string()
    })
    .strict();

const updateOrgSecurityBodySchema = z
    .object({
        passwordResetTokenExpiryHours: z.number().min(1).max(24)
    })
    .strict();

export type UpdateOrgSecurityBody = z.infer<typeof updateOrgSecurityBodySchema>;
export type UpdateOrgSecurityResponse = {
    success: boolean;
};

registry.registerPath({
    method: "put",
    path: "/org/{orgId}/security",
    description: "Update organization security settings",
    tags: [OpenAPITags.Org],
    request: {
        params: updateOrgSecurityParamsSchema,
        body: {
            content: {
                "application/json": {
                    schema: updateOrgSecurityBodySchema
                }
            }
        }
    },
    responses: {}
});

export async function updateOrgSecurity(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    const parsedParams = updateOrgSecurityParamsSchema.safeParse(req.params);

    if (!parsedParams.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedParams.error).toString()
            )
        );
    }

    const parsedBody = updateOrgSecurityBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString()
            )
        );
    }

    const { orgId } = parsedParams.data;
    const { passwordResetTokenExpiryHours } = parsedBody.data;

    // Check if the requesting user has permission to update the org
    const hasPermission = await checkUserActionPermission(ActionsEnum.updateOrg, req);

    if (!hasPermission) {
        return next(
            createHttpError(
                HttpCode.FORBIDDEN,
                "Insufficient permissions to update organization security settings"
            )
        );
    }

    try {
        // Update the organization
        await db
            .update(orgs)
            .set({ passwordResetTokenExpiryHours })
            .where(eq(orgs.orgId, orgId));

        logger.info(
            `Organization ${orgId} security settings updated by user ${req.user!.userId}. Password reset token expiry set to ${passwordResetTokenExpiryHours} hours.`
        );

        return response<UpdateOrgSecurityResponse>(res, {
            data: { success: true },
            success: true,
            error: false,
            message: "Organization security settings updated successfully",
            status: HttpCode.OK
        });

    } catch (e) {
        logger.error("Failed to update organization security settings", e);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to update organization security settings"
            )
        );
    }
} 