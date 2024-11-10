// messageHandlers/chat.ts
import { MessageHandler } from "../ws";

export const handleNewtMessage: MessageHandler = async (context) => {
    const { message, senderNewtId, sendToClient } = context;
    
    // Process chat message
    // ... your chat logic here ...

    // Example response
    return {
        message: {
            type: 'newt_response',
            data: {
                originalMessage: message.data,
                timestamp: new Date().toISOString()
            }
        },
        broadcast: false,  // Send to all clients
        excludeSender: false  // Include sender in broadcast
    };
};