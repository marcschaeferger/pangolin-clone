// This file is licensed under the Fossorial Commercial License.
// Unauthorized use, copying, modification, or distribution is strictly prohibited.
//
// Copyright (c) 2025 Fossorial LLC. All rights reserved.

import {
    createSession,
    generateId,
    generateSessionToken,
    serializeSessionCookie
} from "@server/auth/sessions/app";
import db from "@server/db";
import { Idp, idpOrg, orgs, roles, User, userOrgs, users } from "@server/db/schemas";
import logger from "@server/logger";
import { UserType } from "@server/types/UserTypes";
import { eq, and, inArray } from "drizzle-orm";
import jmespath from "jmespath";
import { Request, Response } from "express";

export async function oidcAutoProvision({
    idp,
    claims,
    existingUser,
    userIdentifier,
    email,
    name,
    req,
    res
}: {
    idp: Idp;
    claims: any;
    existingUser?: User;
    userIdentifier: string;
    email?: string;
    name?: string;
    req: Request;
    res: Response;
}) {
    const allOrgs = await db.select().from(orgs);

    const defaultRoleMapping = idp.defaultRoleMapping;
    const defaultOrgMapping = idp.defaultOrgMapping;

    let userOrgInfo: { orgId: string; roleId: number }[] = [];
    for (const org of allOrgs) {
        const [idpOrgRes] = await db
            .select()
            .from(idpOrg)
            .where(
                and(eq(idpOrg.idpId, idp.idpId), eq(idpOrg.orgId, org.orgId))
            );

        let roleId: number | undefined = undefined;

        const orgMapping = idpOrgRes?.orgMapping || defaultOrgMapping;
        const hydratedOrgMapping = hydrateOrgMapping(orgMapping, org.orgId);

        if (hydratedOrgMapping) {
            logger.debug("Hydrated Org Mapping", {
                hydratedOrgMapping
            });
            const orgId = jmespath.search(claims, hydratedOrgMapping);
            logger.debug("Extraced Org ID", { orgId });
            if (orgId !== true && orgId !== org.orgId) {
                // user not allowed to access this org
                continue;
            }
        }

        const roleMapping = idpOrgRes?.roleMapping || defaultRoleMapping;
        if (roleMapping) {
            logger.debug("Role Mapping", { roleMapping });
            const roleName = jmespath.search(claims, roleMapping);

            if (!roleName) {
                logger.error("Role name not found in the ID token", {
                    roleName
                });
                continue;
            }

            const [roleRes] = await db
                .select()
                .from(roles)
                .where(
                    and(eq(roles.orgId, org.orgId), eq(roles.name, roleName))
                );

            if (!roleRes) {
                logger.error("Role not found", {
                    orgId: org.orgId,
                    roleName
                });
                continue;
            }

            roleId = roleRes.roleId;

            userOrgInfo.push({
                orgId: org.orgId,
                roleId
            });
        }
    }

    logger.debug("User org info", { userOrgInfo });

    let existingUserId = existingUser?.userId;

    // sync the user with the orgs and roles
    await db.transaction(async (trx) => {
        let userId = existingUser?.userId;

        // create user if not exists
        if (!existingUser) {
            userId = generateId(15);

            await trx.insert(users).values({
                userId,
                username: userIdentifier,
                email: email || null,
                name: name || null,
                type: UserType.OIDC,
                idpId: idp.idpId,
                emailVerified: true, // OIDC users are always verified
                dateCreated: new Date().toISOString()
            });
        } else {
            // set the name and email
            await trx
                .update(users)
                .set({
                    username: userIdentifier,
                    email: email || null,
                    name: name || null
                })
                .where(eq(users.userId, userId!));
        }

        existingUserId = userId;

        // get all current user orgs
        const currentUserOrgs = await trx
            .select()
            .from(userOrgs)
            .where(eq(userOrgs.userId, userId!));

        // Delete orgs that are no longer valid
        const orgsToDelete = currentUserOrgs.filter(
            (currentOrg) =>
                !userOrgInfo.some((newOrg) => newOrg.orgId === currentOrg.orgId)
        );

        if (orgsToDelete.length > 0) {
            await trx.delete(userOrgs).where(
                and(
                    eq(userOrgs.userId, userId!),
                    inArray(
                        userOrgs.orgId,
                        orgsToDelete.map((org) => org.orgId)
                    )
                )
            );
        }

        // Update roles for existing orgs where the role has changed
        const orgsToUpdate = currentUserOrgs.filter((currentOrg) => {
            const newOrg = userOrgInfo.find(
                (newOrg) => newOrg.orgId === currentOrg.orgId
            );
            return newOrg && newOrg.roleId !== currentOrg.roleId;
        });

        if (orgsToUpdate.length > 0) {
            for (const org of orgsToUpdate) {
                const newRole = userOrgInfo.find(
                    (newOrg) => newOrg.orgId === org.orgId
                );
                if (newRole) {
                    await trx
                        .update(userOrgs)
                        .set({ roleId: newRole.roleId })
                        .where(
                            and(
                                eq(userOrgs.userId, userId!),
                                eq(userOrgs.orgId, org.orgId)
                            )
                        );
                }
            }
        }

        // Add new orgs that don't exist yet
        const orgsToAdd = userOrgInfo.filter(
            (newOrg) =>
                !currentUserOrgs.some(
                    (currentOrg) => currentOrg.orgId === newOrg.orgId
                )
        );

        if (orgsToAdd.length > 0) {
            await trx.insert(userOrgs).values(
                orgsToAdd.map((org) => ({
                    userId: userId!,
                    orgId: org.orgId,
                    roleId: org.roleId,
                    dateCreated: new Date().toISOString()
                }))
            );
        }
    });

    const token = generateSessionToken();
    const sess = await createSession(token, existingUserId!);
    const isSecure = req.protocol === "https";
    const cookie = serializeSessionCookie(
        token,
        isSecure,
        new Date(sess.expiresAt)
    );

    res.appendHeader("Set-Cookie", cookie);
}

function hydrateOrgMapping(
    orgMapping: string | null,
    orgId: string
): string | undefined {
    if (!orgMapping) {
        return undefined;
    }
    return orgMapping.split("{{orgId}}").join(orgId);
}
