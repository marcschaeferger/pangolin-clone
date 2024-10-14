import { Request } from 'express';
import { db } from '@server/db';
import { userActions, roleActions, userOrgs } from '@server/db/schema';
import { and, eq } from 'drizzle-orm';
import createHttpError from 'http-errors';
import HttpCode from '@server/types/HttpCode';

export enum ActionsEnum {
    createOrg = "createOrg",
    deleteOrg = "deleteOrg",
    getOrg = "getOrg",
    listOrgs = "listOrgs",
    updateOrg = "updateOrg",
    createSite = "createSite",
    deleteSite = "deleteSite",
    getSite = "getSite",
    listSites = "listSites",
    updateSite = "updateSite",
    createResource = "createResource",
    deleteResource = "deleteResource",
    getResource = "getResource",
    listResources = "listResources",
    updateResource = "updateResource",
    createTarget = "createTarget",
    deleteTarget = "deleteTarget",
    getTarget = "getTarget",
    listTargets = "listTargets",
    updateTarget = "updateTarget",
    createRole = "createRole",
    deleteRole = "deleteRole",
    getRole = "getRole",
    listRoles = "listRoles",
    updateRole = "updateRole",
    addUser = "addUser",
    removeUser = "removeUser",
    listUsers = "listUsers",
    listSiteRoles = "listSiteRoles",
    listResourceRoles = "listResourceRoles",
    addRoleSite = "addRoleSite",
    addRoleResource = "addRoleResource",
    removeRoleResource = "removeRoleResource",
    removeRoleSite = "removeRoleSite",
    addRoleAction = "addRoleAction",
    removeRoleAction = "removeRoleAction",
    listRoleSites = "listRoleSites",
    listRoleResources = "listRoleResources",
    listRoleActions = "listRoleActions",
    addUserRole = "addUserRole",
    addUserResource = "addUserResource",
    addUserSite = "addUserSite",
    addUserAction = "addUserAction",
    removeUserAction = "removeUserAction",
    removeUserResource = "removeUserResource",
    removeUserSite = "removeUserSite",
}

export async function checkUserActionPermission(actionId: string, req: Request): Promise<boolean> {
    const userId = req.user?.userId;
    let onlyCheckUser = false;

    if (actionId = ActionsEnum.createOrg) {
        onlyCheckUser = true;
    }

    if (!userId) {
        throw createHttpError(HttpCode.UNAUTHORIZED, 'User not authenticated');
    }

    if (!req.userOrgId && !onlyCheckUser) {
        throw createHttpError(HttpCode.BAD_REQUEST, 'Organization ID is required');
    }

    try {
        let userOrgRoleId = req.userOrgRoleId;

        // If userOrgRoleId is not available on the request, fetch it
        if (userOrgRoleId === undefined && !onlyCheckUser) {
            const userOrgRole = await db.select()
                .from(userOrgs)
                .where(and(eq(userOrgs.userId, userId), eq(userOrgs.orgId, req.userOrgId!)))
                .limit(1);

            if (userOrgRole.length === 0) {
                throw createHttpError(HttpCode.FORBIDDEN, 'User does not have access to this organization');
            }

            userOrgRoleId = userOrgRole[0].roleId;
        }

        // Check if the user has direct permission for the action in the current org
        const userActionPermission = await db.select()
            .from(userActions)
            .where(
                and(
                    eq(userActions.userId, userId),
                    eq(userActions.actionId, actionId),
                    eq(userActions.orgId, req.userOrgId!) // TODO: we cant pass the org id if we are not checking the org
                )
            )
            .limit(1);

        if (userActionPermission.length > 0) {
            return true;
        }
        if (!onlyCheckUser) {

            // If no direct permission, check role-based permission
            const roleActionPermission = await db.select()
                .from(roleActions)
                .where(
                    and(
                        eq(roleActions.actionId, actionId),
                        eq(roleActions.roleId, userOrgRoleId!),
                        eq(roleActions.orgId, req.userOrgId!)
                    )
                )
                .limit(1);

            return roleActionPermission.length > 0;
        }

        return false;

    } catch (error) {
        console.error('Error checking user action permission:', error);
        throw createHttpError(HttpCode.INTERNAL_SERVER_ERROR, 'Error checking action permission');
    }
}
