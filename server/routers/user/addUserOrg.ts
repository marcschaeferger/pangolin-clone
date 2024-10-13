import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { userOrgs, users, roles } from '@server/db/schema';
import { and, eq } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';

const addUserParamsSchema = z.object({
    userId: z.string().uuid(),
    orgId: z.number().int().positive(),
});

const addUserSchema = z.object({
    roleId: z.number().int().positive(),
});

export async function addUserOrg(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        const parsedParams = addUserParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedParams.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { userId, orgId } = parsedParams.data;

        const parsedBody = addUserSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedBody.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { roleId } = parsedBody.data;

        // Check if the user has permission to add users
        const hasPermission = await checkUserActionPermission(ActionsEnum.addUser, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
        }

        // Check if the user exists
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (user.length === 0) {
            return next(createHttpError(HttpCode.NOT_FOUND, `User with ID ${userId} not found`));
        }

        // Check if the user is already in the organization
        const existingUserOrg = await db.select()
            .from(userOrgs)
            .where(and(eq(userOrgs.userId, userId), eq(userOrgs.orgId, orgId)))
            .limit(1);

        if (existingUserOrg.length > 0) {
            return next(createHttpError(HttpCode.CONFLICT, 'User is already a member of this organization'));
        }

        // Add the user to the userOrgs table
        const newUserOrg = await db.insert(userOrgs).values({
            userId,
            orgId,
            roleId
        }).returning();

        return response(res, {
            data: newUserOrg[0],
            success: true,
            error: false,
            message: "User added to organization successfully",
            status: HttpCode.CREATED,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}