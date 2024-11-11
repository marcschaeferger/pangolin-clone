import { Router, Request, Response } from "express";
import { Server as HttpServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { Socket } from "net";
import { Newt, newts, NewtSession } from "@server/db/schema";
import { eq } from "drizzle-orm";
import db from "@server/db";
import { validateNewtSessionToken } from "@server/auth/newt";
import { messageHandlers } from "./messageHandlers";

// Custom interfaces
interface WebSocketRequest extends IncomingMessage {
    token?: string;
}

interface AuthenticatedWebSocket extends WebSocket {
    newt?: Newt;
    isAlive?: boolean;
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
    senderNewtId: string;
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
    console.log(`Client added to tracking - Newt ID: ${newtId}, Total connections: ${existingClients.length}`);
};

const removeClient = (newtId: string, ws: AuthenticatedWebSocket): void => {
    const existingClients = connectedClients.get(newtId) || [];
    const updatedClients = existingClients.filter(client => client !== ws);
    
    if (updatedClients.length === 0) {
        connectedClients.delete(newtId);
        console.log(`All connections removed for Newt ID: ${newtId}`);
    } else {
        connectedClients.set(newtId, updatedClients);
        console.log(`Connection removed - Newt ID: ${newtId}, Remaining connections: ${updatedClients.length}`);
    }
};

// Helper functions for sending messages
const sendToClient = (newtId: string, message: WSMessage): boolean => {
    const clients = connectedClients.get(newtId);
    if (!clients || clients.length === 0) {
        console.log(`No active connections found for Newt ID: ${newtId}`);
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
        console.error("Token verification failed:", error);
        return null;
    }
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
                socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                socket.destroy();
                return;
            }

            const tokenPayload = await verifyToken(token);
            if (!tokenPayload) {
                socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
                socket.destroy();
                return;
            }

            request.token = token;

            wss.handleUpgrade(request, socket, head, (ws: AuthenticatedWebSocket) => {
                ws.newt = tokenPayload.newt;
                ws.isAlive = true;
                wss.emit("connection", ws, request);
            });
        } catch (error) {
            console.error("Upgrade error:", error);
            socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
            socket.destroy();
        }
    });
};

// WebSocket connection handler
wss.on("connection", (ws: AuthenticatedWebSocket, request: WebSocketRequest) => {
    const newtId = ws.newt?.newtId;
    if (!newtId) {
        console.error("Connection attempt without newt ID");
        return ws.terminate();
    }

    // Add client to tracking
    addClient(newtId, ws);

    // Set up ping-pong for connection health check
    const pingInterval = setInterval(() => {
        if (ws.isAlive === false) {
            clearInterval(pingInterval);
            removeClient(newtId, ws);
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    }, 30000);

    ws.on("pong", () => {
        ws.isAlive = true;
    });

    ws.on("message", async (data) => {
        try {
            const message: WSMessage = JSON.parse(data.toString());
            // console.log(`Message received from Newt ID ${newtId}:`, message);
    
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
                senderNewtId: newtId,
                sendToClient,
                broadcastToAllExcept,
                connectedClients
            });
    
            // Send response if one was returned
            if (response) {
                if (response.broadcast) {
                    // Broadcast to all clients except sender if specified
                    broadcastToAllExcept(response.message, response.excludeSender ? newtId : undefined);
                } else if (response.targetNewtId) {
                    // Send to specific client if targetNewtId is provided
                    sendToClient(response.targetNewtId, response.message);
                } else {
                    // Send back to sender
                    ws.send(JSON.stringify(response.message));
                }
            }
    
        } catch (error) {
            console.error("Message handling error:", error);
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
        clearInterval(pingInterval);
        removeClient(newtId, ws);
        console.log(`Client disconnected - Newt ID: ${newtId}`);
    });

    ws.on("error", (error: Error) => {
        console.error(`WebSocket error for Newt ID ${newtId}:`, error);
    });
});

export {
    router,
    handleWSUpgrade,
    sendToClient,
    broadcastToAllExcept,
    connectedClients
};