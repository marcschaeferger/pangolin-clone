import { ActionsEnum } from "@server/auth/actions";
import { db } from "@server/db";
import { actions, roles, roleActions } from "../db/schema";
import { eq, inArray } from "drizzle-orm";
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

        await db.transaction(async (trx) => {

    // Add new actions
    for (const actionId of actionsToAdd) {
        logger.debug(`Adding action: ${actionId}`);
        await trx.insert(actions).values({ actionId }).execute();
        // Add new actions to the Default role
        if (defaultRoles.length != 0) {
            await trx
                .insert(roleActions)
                .values(
                    defaultRoles.map((role) => ({
                        roleId: role.roleId!,
                        actionId,
                        orgId: role.orgId!
                    }))
                )
                .execute();
        }
    }

    // Remove deprecated actions
    if (actionsToRemove.length > 0) {
        logger.debug(`Removing actions: ${actionsToRemove.join(", ")}`);
        await trx
            .delete(actions)
            .where(inArray(actions.actionId, actionsToRemove))
            .execute();
        await trx
            .delete(roleActions)
            .where(inArray(roleActions.actionId, actionsToRemove))
            .execute();
    }
});
}

export async function createAdminRole(orgId: string) {
    let roleId: any;
    await db.transaction(async (trx) => {

    const [insertedRole] = await trx
        .insert(roles)
        .values({
            orgId,
            isAdmin: true,
            name: "Admin",
            description: "Admin role with the most permissions"
        })
        .returning({ roleId: roles.roleId })
        .execute();

    if (!insertedRole || !insertedRole.roleId) {
        throw new Error("Failed to create Admin role");
    }

    roleId = insertedRole.roleId;

    const actionIds = await trx.select().from(actions).execute();

    if (actionIds.length === 0) {
        logger.info("No actions to assign to the Admin role");
        return;
    }

    await trx
        .insert(roleActions)
        .values(
            actionIds.map((action) => ({
                roleId,
                actionId: action.actionId,
                orgId
            }))
        )
        .execute();
    });

    if (!roleId) {
        throw new Error("Failed to create Admin role");
    }

    return roleId;
}
