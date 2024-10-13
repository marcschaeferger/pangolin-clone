import { ActionsEnum } from "@server/auth/actions";
import { db } from "@server/db";
import { actions, roles, roleActions } from "./schema";
import { eq, and, inArray, notInArray } from "drizzle-orm";
import logger from "@server/logger";

export async function ensureActions() {
    const actionIds = Object.values(ActionsEnum);
    const existingActions = await db.select().from(actions).execute();
    const existingActionIds = existingActions.map(action => action.actionId);

    const actionsToAdd = actionIds.filter(id => !existingActionIds.includes(id));
    const actionsToRemove = existingActionIds.filter(id => !actionIds.includes(id as ActionsEnum));

    const defaultRoles = await db
        .select()
        .from(roles)
        .where(eq(roles.isSuperuserRole, true))
        .execute();

    if (defaultRoles.length === 0) {
        logger.info('No default roles to assign');
        return;
    }

    // Add new actions
    for (const actionId of actionsToAdd) {
    await db.insert(actions).values({ actionId }).execute();
        // Add new actions to the Default role
        await db.insert(roleActions)
            .values(defaultRoles.map(role => ({ roleId: role.roleId!, actionId, orgId: role.orgId! })))
            .execute();
    }

    // Remove deprecated actions
    if (actionsToRemove.length > 0) {
        await db.delete(actions).where(inArray(actions.actionId, actionsToRemove)).execute();
        await db.delete(roleActions).where(inArray(roleActions.actionId, actionsToRemove)).execute();
    }
}

export async function createSuperuserRole(orgId: number) {
    // Create the Default role if it doesn't exist
    const [insertedRole] = await db
        .insert(roles)
        .values({
            orgId,
            isSuperuserRole: true,
            name: 'Superuser',
            description: 'Superuser role with all actions'
        })
        .returning({ roleId: roles.roleId })
        .execute();

    const roleId = insertedRole.roleId;

    // Add all current actions to the new Default role
    const actionIds = Object.values(ActionsEnum);
    await db.insert(roleActions)
        .values(actionIds.map(actionId => ({
            roleId,
            actionId: actionId,
            orgId
        })))
        .execute();
}