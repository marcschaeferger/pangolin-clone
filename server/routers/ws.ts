import { Router, Request, Response } from 'express';
import { Server as HttpServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { Newt, newts, NewtSession } from '@server/db/schema';
import { eq } from 'drizzle-orm';
import db from '@server/db';
import { validateNewtSessionToken } from '@server/auth/newt';

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

const router: Router = Router();
const wss: WebSocketServer = new WebSocketServer({ noServer: true });

// Token verification middleware
const verifyToken = async (token: string): Promise<TokenPayload | null> => {
    try {

        const { session, newt } = await validateNewtSessionToken(
            token
        );

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
        console.error('Token verification failed:', error);
        return null;
    }
};

// Handle WebSocket upgrade requests
router.get('/ws', (req: Request, res: Response) => {
    // WebSocket upgrade will be handled by the server
    res.status(200).send('WebSocket endpoint');
});

// Set up WebSocket server handling
const handleWSUpgrade = (server: HttpServer): void => {
    server.on('upgrade', async (request: WebSocketRequest, socket: Socket, head: Buffer) => {
        try {
            // Extract token from query parameters or headers
            const token = request.url?.includes('?')
                ? new URLSearchParams(request.url.split('?')[1]).get('token') || ''
                : request.headers['sec-websocket-protocol'];

            if (!token) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            // Verify the token
            const tokenPayload = await verifyToken(token);
            if (!tokenPayload) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            // Store token payload data in the request for later use
            request.token = token;

            wss.handleUpgrade(request, socket, head, (ws: AuthenticatedWebSocket) => {
                // Attach newt data to the WebSocket instance
                ws.newt = tokenPayload.newt;
                ws.isAlive = true;
                wss.emit('connection', ws, request);
            });
        } catch (error) {
            console.error('Upgrade error:', error);
            socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
            socket.destroy();
        }
    });
};

// WebSocket message interface
interface WSMessage {
    type: string;
    data: any;
}

// WebSocket connection handler
wss.on('connection', (ws: AuthenticatedWebSocket, request: WebSocketRequest) => {
    console.log(`Client connected - Newt ID: ${ws.newt?.newtId}`);

    // Set up ping-pong for connection health check
    const pingInterval = setInterval(() => {
        if (ws.isAlive === false) {
            clearInterval(pingInterval);
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    }, 30000);

    // Handle pong response
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    // Set up message handler
    ws.on('message', (data) => {
        try {
            const message: WSMessage = JSON.parse(data.toString());
            console.log('Received:', message);

            // Echo the message back
            ws.send(JSON.stringify({
                type: 'echo',
                data: message
            }));
        } catch (error) {
            console.error('Message parsing error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                data: 'Invalid message format'
            }));
        }
    });

    // Handle client disconnect
    ws.on('close', () => {
        clearInterval(pingInterval);
        console.log(`Client disconnected - Newt ID: ${ws.newt?.newtId}`);
    });

    // Handle errors
    ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
    });
});

export {
    router,
    handleWSUpgrade
};