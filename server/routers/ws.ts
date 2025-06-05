import { Router, Request, Response } from "express";
import { Server as HttpServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { Socket } from "net";
import { Newt, newts, NewtSession } from "@server/db";
import { eq } from "drizzle-orm";
import { db } from "@server/db";
import { validateNewtSessionToken } from "@server/auth/sessions/newt";
import { messageHandlers } from "./messageHandlers";
import logger from "@server/logger";

// Custom interfaces
interface WebSocketRequest extends IncomingMessage {
    token?: string;
}

interface AuthenticatedWebSocket extends WebSocket {
    newt?: Newt;
}

interface TokenPayload {
    newt: Newt;
    session: NewtSession;
}

interface WSMessage {
    type: string;
    data: any;
}

interface HandlerResponse {
    message: WSMessage;
    broadcast?: boolean;
    excludeSender?: boolean;
    targetNewtId?: string;
}

interface HandlerContext {
    message: WSMessage;
    senderWs: WebSocket;
    newt: Newt | undefined;
    sendToClient: (newtId: string, message: WSMessage) => boolean;
    broadcastToAllExcept: (message: WSMessage, excludeNewtId?: string) => void;
    connectedClients: Map<string, WebSocket[]>;
}

export type MessageHandler = (context: HandlerContext) => Promise<HandlerResponse | void>;

const router: Router = Router();
const wss: WebSocketServer = new WebSocketServer({ noServer: true });

// Client tracking map
let connectedClients: Map<string, AuthenticatedWebSocket[]> = new Map();

// Helper functions for client management
const addClient = (newtId: string, ws: AuthenticatedWebSocket): void => {
    const existingClients = connectedClients.get(newtId) || [];
    existingClients.push(ws);
    connectedClients.set(newtId, existingClients);
    logger.info(`Client added to tracking - Newt ID: ${newtId}, Total connections: ${existingClients.length}`);
};

const removeClient = (newtId: string, ws: AuthenticatedWebSocket): void => {
    const existingClients = connectedClients.get(newtId) || [];
    const updatedClients = existingClients.filter(client => client !== ws);

    if (updatedClients.length === 0) {
        connectedClients.delete(newtId);
        logger.info(`All connections removed for Newt ID: ${newtId}`);
    } else {
        connectedClients.set(newtId, updatedClients);
        logger.info(`Connection removed - Newt ID: ${newtId}, Remaining connections: ${updatedClients.length}`);
    }
};

// Helper functions for sending messages
const sendToClient = (newtId: string, message: WSMessage): boolean => {
    const clients = connectedClients.get(newtId);
    if (!clients || clients.length === 0) {
        logger.info(`No active connections found for Newt ID: ${newtId}`);
        return false;
    }

    const messageString = JSON.stringify(message);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageString);
        }
    });
    return true;
};

const broadcastToAllExcept = (message: WSMessage, excludeNewtId?: string): void => {
    connectedClients.forEach((clients, newtId) => {
        if (newtId !== excludeNewtId) {
            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(message));
                }
            });
        }
    });
};

// Token verification middleware (unchanged)
const verifyToken = async (token: string): Promise<TokenPayload | null> => {
    try {
        const { session, newt } = await validateNewtSessionToken(token);

        if (!session || !newt) {
            return null;
        }

        const existingNewt = await db
            .select()
            .from(newts)
            .where(eq(newts.newtId, newt.newtId));

        if (!existingNewt || !existingNewt[0]) {
            return null;
        }

        return { newt: existingNewt[0], session };
    } catch (error) {
        logger.error("Token verification failed:", error);
        return null;
    }
};

const setupConnection = (ws: AuthenticatedWebSocket, newt: Newt): void => {
    logger.info("Establishing websocket connection");

    if (!newt) {
        logger.error("Connection attempt without newt");
        return ws.terminate();
    }

    ws.newt = newt;

    // Add client to tracking
    addClient(newt.newtId, ws);

    ws.on("message", async (data) => {
        try {
            const message: WSMessage = JSON.parse(data.toString());
            // logger.info(`Message received from Newt ID ${newtId}:`, message);

            // Validate message format
            if (!message.type || typeof message.type !== "string") {
                throw new Error("Invalid message format: missing or invalid type");
            }

            // Get the appropriate handler for the message type
            const handler = messageHandlers[message.type];
            if (!handler) {
                throw new Error(`Unsupported message type: ${message.type}`);
            }

            // Process the message and get response
            const response = await handler({
                message,
                senderWs: ws,
                newt: ws.newt,
                sendToClient,
                broadcastToAllExcept,
                connectedClients
            });

            // Send response if one was returned
            if (response) {
                if (response.broadcast) {
                    // Broadcast to all clients except sender if specified
                    broadcastToAllExcept(response.message, response.excludeSender ? newt.newtId : undefined);
                } else if (response.targetNewtId) {
                    // Send to specific client if targetNewtId is provided
                    sendToClient(response.targetNewtId, response.message);
                } else {
                    // Send back to sender
                    ws.send(JSON.stringify(response.message));
                }
            }

        } catch (error) {
            logger.error("Message handling error:", error);
            ws.send(JSON.stringify({
                type: "error",
                data: {
                    message: error instanceof Error ? error.message : "Unknown error occurred",
                    originalMessage: data.toString()
                }
            }));
        }
    });

    ws.on("close", () => {
        removeClient(newt.newtId, ws);
        logger.info(`Client disconnected - Newt ID: ${newt.newtId}`);
    });

    ws.on("error", (error: Error) => {
        logger.error(`WebSocket error for Newt ID ${newt.newtId}:`, error);
    });

    logger.info(`WebSocket connection established - Newt ID: ${newt.newtId}`);
};

// Router endpoint (unchanged)
router.get("/ws", (req: Request, res: Response) => {
    res.status(200).send("WebSocket endpoint");
});

// WebSocket upgrade handler
const handleWSUpgrade = (server: HttpServer): void => {
    server.on("upgrade", async (request: WebSocketRequest, socket: Socket, head: Buffer) => {
        try {
            const token = request.url?.includes("?")
                ? new URLSearchParams(request.url.split("?")[1]).get("token") || ""
                : request.headers["sec-websocket-protocol"];

            if (!token) {
                logger.warn("Unauthorized connection attempt: no token...");
                socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                socket.destroy();
                return;
            }

            const tokenPayload = await verifyToken(token);
            if (!tokenPayload) {
                logger.warn("Unauthorized connection attempt: invalid token...");
                socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                socket.destroy();
                return;
            }

            wss.handleUpgrade(request, socket, head, (ws: AuthenticatedWebSocket) => {
                setupConnection(ws, tokenPayload.newt);
            });
        } catch (error) {
            logger.error("WebSocket upgrade error:", error);
            socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
            socket.destroy();
        }
    });
};

export {
    router,
    handleWSUpgrade,
    sendToClient,
    broadcastToAllExcept,
    connectedClients
};
