import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { userOrgs, roles } from "@server/db";
import { eq, and } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import stoi from "@server/lib/stoi";
import { OpenAPITags, registry } from "@server/openApi";

const addUserRoleParamsSchema = z
    .object({
        userId: z.string(),
        roleId: z.string().transform(stoi).pipe(z.number())
    })
    .strict();

export type AddUserRoleResponse = z.infer<typeof addUserRoleParamsSchema>;

registry.registerPath({
    method: "post",
    path: "/role/{roleId}/add/{userId}",
    description: "Add a role to a user.",
    tags: [OpenAPITags.Role, OpenAPITags.User],
    request: {
        params: addUserRoleParamsSchema
    },
    responses: {}
});

export async function addUserRole(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = addUserRoleParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { userId, roleId } = parsedParams.data;

        if (req.user && !req.userOrg) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "You do not have access to this organization"
                )
            );
        }

        const orgId = req.userOrg?.orgId || req.apiKeyOrg?.orgId;

        if (!orgId) {
            return next(
                createHttpError(HttpCode.BAD_REQUEST, "Invalid organization ID")
            );
        }

        const existingUser = await db
            .select()
            .from(userOrgs)
            .where(and(eq(userOrgs.userId, userId), eq(userOrgs.orgId, orgId)))
            .limit(1);

        if (existingUser.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    "User not found or does not belong to the specified organization"
                )
            );
        }

        if (existingUser[0].isOwner) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "Cannot change the role of the owner of the organization"
                )
            );
        }

        const roleExists = await db
            .select()
            .from(roles)
            .where(and(eq(roles.roleId, roleId), eq(roles.orgId, orgId)))
            .limit(1);

        if (roleExists.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    "Role not found or does not belong to the specified organization"
                )
            );
        }

        const newUserRole = await db
            .update(userOrgs)
            .set({ roleId })
            .where(and(eq(userOrgs.userId, userId), eq(userOrgs.orgId, orgId)))
            .returning();

        return response(res, {
            data: newUserRole[0],
            success: true,
            error: false,
            message: "Role added to user successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
