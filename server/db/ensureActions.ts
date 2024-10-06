import { ActionsEnum } from "@server/auth/actions";
import { db } from "@server/db";
import { actions } from "./schema";
import { eq } from "drizzle-orm";

// Ensure actions are in the database
export async function ensureActions() {
    const actionIds = Object.values(ActionsEnum);
    for (const actionId of actionIds) {
        const existing = await db
            .select()
            .from(actions)
            .where(eq(actions.name, actionId))
            .execute();
        if (existing.length === 0) {
            await db
                .insert(actions)
                .values({
                    actionId
                })
                .execute();
        }
    }

    // make sure all actions are in the database
    const existingActions = await db
        .select()
        .from(actions)
        .execute();
    for (const action of existingActions) {
        if (!actionIds.includes(action.actionId as ActionsEnum)) {
            await db
                .delete(actions)
                .where(eq(actions.actionId, action.actionId))
                .execute();
        }
    }
}