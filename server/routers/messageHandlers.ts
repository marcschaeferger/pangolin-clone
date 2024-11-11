import { handleNewtMessage } from "./newt";
import { MessageHandler } from "./ws";

export const messageHandlers: Record<string, MessageHandler> = {
    "newt": handleNewtMessage,
};