import { handleRegisterMessage } from "./newt";
import { MessageHandler } from "./ws";

export const messageHandlers: Record<string, MessageHandler> = {
    "newt/wg/register": handleRegisterMessage,
};