import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { orgs, resources, roleResources, roles, userResources } from '@server/db/schema';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';
import { eq, and } from 'drizzle-orm';
import stoi from '@server/utils/stoi';

const createResourceParamsSchema = z.object({
            siteId: z.string().optional().transform(stoi).pipe(z.number().int().positive().optional()),
    orgId: z.string()
});

// Define Zod schema for request body validation
const createResourceSchema = z.object({
    name: z.string().min(1).max(255),
    subdomain: z.string().min(1).max(255).optional(),
});

export async function createResource(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        // Validate request body
        const parsedBody = createResourceSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedBody.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { name, subdomain } = parsedBody.data;

        // Validate request params
        const parsedParams = createResourceParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedParams.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { siteId, orgId } = parsedParams.data;

        // Check if the user has permission to list sites
        const hasPermission = await checkUserActionPermission(ActionsEnum.createResource, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
        }

        if (!req.userOrgRoleId) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have a role'));
        }

        // get the org
        const org = await db.select()
            .from(orgs)
            .where(eq(orgs.orgId, orgId))
            .limit(1);
        
        if (org.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Organization with ID ${orgId} not found`
                )
            );
        }

        // Generate a unique resourceId
        const resourceId = `${subdomain}.${org[0].orgId}.${org[0].domain}`;

        // Create new resource in the database
        const newResource = await db.insert(resources).values({
            resourceId,
            siteId,
            orgId,
            name,
            subdomain,
        }).returning();

        // find the superuser roleId and also add the resource to the superuser role
        const superuserRole = await db.select()
            .from(roles)
            .where(and(eq(roles.isSuperuserRole, true), eq(roles.orgId, orgId)))
            .limit(1);

        if (superuserRole.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Superuser role not found`
                )
            );
        }

        await db.insert(roleResources).values({
            roleId: superuserRole[0].roleId,
            resourceId: newResource[0].resourceId,
        });

        if (req.userOrgRoleId != superuserRole[0].roleId) {
            // make sure the user can access the resource
            await db.insert(userResources).values({
                userId: req.user?.userId!,
                resourceId: newResource[0].resourceId,
            });
        }

        response(res, {
            data: newResource[0],
            success: true,
            error: false,
            message: "Resource created successfully",
            status: HttpCode.CREATED,
        });
    } catch (error) {
        throw error;
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}
