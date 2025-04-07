import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { eq } from "drizzle-orm";
import {
    domains,
    Org,
    orgDomains,
    orgs,
    roleActions,
    roles,
    userOrgs
} from "@server/db/schemas";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { createAdminRole } from "@server/setup/ensureActions";
import config from "@server/lib/config";
import { fromError } from "zod-validation-error";
import { defaultRoleAllowedActions } from "../role";
import { OpenAPITags, registry } from "@server/openApi";

const createOrgSchema = z
    .object({
        orgId: z.string(),
        name: z.string().min(1).max(255)
    })
    .strict();

// const MAX_ORGS = 5;

registry.registerPath({
    method: "put",
    path: "/org",
    description: "Create a new organization",
    tags: [OpenAPITags.Org],
    request: {
        body: {
            content: {
                "application/json": {
                    schema: createOrgSchema
                }
            }
        }
    },
    responses: {}
});

export async function createOrg(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        // should this be in a middleware?
        if (config.getRawConfig().flags?.disable_user_create_org) {
            if (!req.user?.serverAdmin) {
                return next(
                    createHttpError(
                        HttpCode.FORBIDDEN,
                        "Only server admins can create organizations"
                    )
                );
            }
        }

        const parsedBody = createOrgSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        // const userOrgIds = req.userOrgIds;
        // if (userOrgIds && userOrgIds.length > MAX_ORGS) {
        //     return next(
        //         createHttpError(
        //             HttpCode.FORBIDDEN,
        //             `Maximum number of organizations reached.`
        //         )
        //     );
        // }

        const { orgId, name } = parsedBody.data;

        // make sure the orgId is unique
        const orgExists = await db
            .select()
            .from(orgs)
            .where(eq(orgs.orgId, orgId))
            .limit(1);

        if (orgExists.length > 0) {
            return next(
                createHttpError(
                    HttpCode.CONFLICT,
                    `Organization with ID ${orgId} already exists`
                )
            );
        }

        let error = "";
        let org: Org | null = null;

        await db.transaction(async (trx) => {
            const allDomains = await trx
                .select()
                .from(domains)
                .where(eq(domains.configManaged, true));

            const newOrg = await trx
                .insert(orgs)
                .values({
                    orgId,
                    name
                })
                .returning();

            if (newOrg.length === 0) {
                error = "Failed to create organization";
                trx.rollback();
                return;
            }

            org = newOrg[0];

            const roleId = await createAdminRole(newOrg[0].orgId);

            if (!roleId) {
                error = "Failed to create Admin role";
                trx.rollback();
                return;
            }

            await trx.insert(orgDomains).values(
                allDomains.map((domain) => ({
                    orgId: newOrg[0].orgId,
                    domainId: domain.domainId
                }))
            );

            await trx.insert(userOrgs).values({
                userId: req.user!.userId,
                orgId: newOrg[0].orgId,
                roleId: roleId,
                isOwner: true
            });

            const memberRole = await trx
                .insert(roles)
                .values({
                    name: "Member",
                    description: "Members can only view resources",
                    orgId
                })
                .returning();

            await trx.insert(roleActions).values(
                defaultRoleAllowedActions.map((action) => ({
                    roleId: memberRole[0].roleId,
                    actionId: action,
                    orgId
                }))
            );
        });

        if (!org) {
            return next(
                createHttpError(
                    HttpCode.INTERNAL_SERVER_ERROR,
                    "Failed to createo org"
                )
            );
        }

        if (error) {
            return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, error));
        }

        return response(res, {
            data: org,
            success: true,
            error: false,
            message: "Organization created successfully",
            status: HttpCode.CREATED
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
