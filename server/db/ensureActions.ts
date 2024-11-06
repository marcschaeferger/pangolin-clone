import { ActionsEnum } from "@server/auth/actions";
import { db } from "@server/db";
import { actions, roles, roleActions } from "./schema";
import { eq, and, inArray, notInArray } from "drizzle-orm";
import logger from "@server/logger";

export async function ensureActions() {
    const actionIds = Object.values(ActionsEnum);
    const existingActions = await db.select().from(actions).execute();
    const existingActionIds = existingActions.map((action) => action.actionId);

    const actionsToAdd = actionIds.filter(
        (id) => !existingActionIds.includes(id)
    );
    const actionsToRemove = existingActionIds.filter(
        (id) => !actionIds.includes(id as ActionsEnum)
    );

    const defaultRoles = await db
        .select()
        .from(roles)
        .where(eq(roles.isAdmin, true))
        .execute();

    // Add new actions
    for (const actionId of actionsToAdd) {
        logger.debug(`Adding action: ${actionId}`);
        await db.insert(actions).values({ actionId }).execute();
        // Add new actions to the Default role
        if (defaultRoles.length != 0) {
            await db
                .insert(roleActions)
                .values(
                    defaultRoles.map((role) => ({
                        roleId: role.roleId!,
                        actionId,
                        orgId: role.orgId!,
                    }))
                )
                .execute();
        }
    }

    // Remove deprecated actions
    if (actionsToRemove.length > 0) {
        logger.debug(`Removing actions: ${actionsToRemove.join(", ")}`);
        await db
            .delete(actions)
            .where(inArray(actions.actionId, actionsToRemove))
            .execute();
        await db
            .delete(roleActions)
            .where(inArray(roleActions.actionId, actionsToRemove))
            .execute();
    }
}

export async function createAdminRole(orgId: string) {
    // Create the Default role if it doesn't exist
    const [insertedRole] = await db
        .insert(roles)
        .values({
            orgId,
            isAdmin: true,
            name: "Admin",
            description: "Admin role most permissions",
        })
        .returning({ roleId: roles.roleId })
        .execute();

    const roleId = insertedRole.roleId;

    const actionIds = await db.select().from(actions).execute();

    if (actionIds.length === 0) {
        logger.info("No actions to assign to the Admin role");
        return;
    }

    await db
        .insert(roleActions)
        .values(
            actionIds.map((action) => ({
                roleId,
                actionId: action.actionId,
                orgId,
            }))
        )
        .execute();

    return roleId;
}
