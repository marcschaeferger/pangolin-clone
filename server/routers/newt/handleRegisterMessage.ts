import db from "@server/db";
import { MessageHandler } from "../ws";
import { sites } from "@server/db/schema";
import { eq } from "drizzle-orm";

export const handleRegisterMessage: MessageHandler = async (context) => {
    const { message, newt, sendToClient } = context;
    
    if (!newt) {
        console.log("Newt not found");
        return;
    }

    if (!newt.siteId) {
        console.log("Newt has no site!"); // TODO: Maybe we create the site here?
        return;
    }
    
    const siteId = newt.siteId;
        
    // get the site
    const site = await db
    .select()
    .from(sites)
    .where(eq(sites.siteId, siteId))
    .limit(1);


        const { publicKey } = message.data;

    return {
        message: {
            type: 'newt/wg/connect',
            data: {
                publicKey: 'publicKey',

            }
        },
        broadcast: false,  // Send to all clients
        excludeSender: false  // Include sender in broadcast
    };
};