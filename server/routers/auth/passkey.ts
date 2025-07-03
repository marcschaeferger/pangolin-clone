import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";
import { fromError } from "zod-validation-error";
import { z } from "zod";
import { db } from "@server/db";
import { User, passkeys, users, webauthnChallenge } from "@server/db";
import { eq, and, lt } from "drizzle-orm";
import { response } from "@server/lib";
import logger from "@server/logger";
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse
} from "@simplewebauthn/server";
import type {
    GenerateRegistrationOptionsOpts,
    VerifyRegistrationResponseOpts,
    GenerateAuthenticationOptionsOpts,
    VerifyAuthenticationResponseOpts,
    VerifiedRegistrationResponse,
    VerifiedAuthenticationResponse
} from "@simplewebauthn/server";
import config from "@server/lib/config";
import { UserType } from "@server/types/UserTypes";

// The RP ID is the domain name of your application
const rpID = new URL(config.getRawConfig().app.dashboard_url).hostname;
const rpName = "Pangolin";
const origin = config.getRawConfig().app.dashboard_url;

// Database-based challenge storage (replaces in-memory storage)
// Challenges are stored in the webauthnChallenge table with automatic expiration
// This supports clustered deployments and persists across server restarts

// Clean up expired challenges every 5 minutes
setInterval(async () => {
    try {
        const now = Date.now();
        await db
            .delete(webauthnChallenge)
            .where(lt(webauthnChallenge.expiresAt, now));
        logger.debug("Cleaned up expired passkey challenges");
    } catch (error) {
        logger.error("Failed to clean up expired passkey challenges", error);
    }
}, 5 * 60 * 1000);

// Helper functions for challenge management
async function storeChallenge(sessionId: string, challenge: string, passkeyName?: string, userId?: string) {
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes
    
    // Delete any existing challenge for this session
    await db.delete(webauthnChallenge).where(eq(webauthnChallenge.sessionId, sessionId));
    
    // Insert new challenge
    await db.insert(webauthnChallenge).values({
        sessionId,
        challenge,
        passkeyName,
        userId,
        expiresAt
    });
}

async function getChallenge(sessionId: string) {
    const [challengeData] = await db
        .select()
        .from(webauthnChallenge)
        .where(eq(webauthnChallenge.sessionId, sessionId))
        .limit(1);

    if (!challengeData) {
        return null;
    }

    // Check if expired
    if (challengeData.expiresAt < Date.now()) {
        await db.delete(webauthnChallenge).where(eq(webauthnChallenge.sessionId, sessionId));
        return null;
    }

    return challengeData;
}

async function clearChallenge(sessionId: string) {
    await db.delete(webauthnChallenge).where(eq(webauthnChallenge.sessionId, sessionId));
}

export const registerPasskeyBody = z.object({
    name: z.string().min(1)
}).strict();

export const verifyRegistrationBody = z.object({
    credential: z.any()
}).strict();

export const startAuthenticationBody = z.object({
    email: z.string().email().optional()
}).strict();

export const verifyAuthenticationBody = z.object({
    credential: z.any()
}).strict();

export async function startRegistration(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    const parsedBody = registerPasskeyBody.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString()
            )
        );
    }

    const { name } = parsedBody.data;
    const user = req.user as User;

    // Only allow internal users to use passkeys
    if (user.type !== UserType.Internal) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                "Passkeys are only available for internal users"
            )
        );
    }

    try {
        // Get existing passkeys for user
        const existingPasskeys = await db
            .select()
            .from(passkeys)
            .where(eq(passkeys.userId, user.userId));

        const excludeCredentials = existingPasskeys.map(key => ({
            id: Buffer.from(key.credentialId, 'base64'),
            type: 'public-key' as const,
            transports: key.transports ? JSON.parse(key.transports) : undefined
        }));

        const options: GenerateRegistrationOptionsOpts = {
            rpName,
            rpID,
            userID: user.userId,
            userName: user.email || user.username,
            attestationType: 'none',
            excludeCredentials,
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
            }
        };

        const registrationOptions = await generateRegistrationOptions(options);

        // Store challenge in database
        await storeChallenge(req.session.sessionId, registrationOptions.challenge, name, user.userId);

        return response(res, {
            data: registrationOptions,
            success: true,
            error: false,
            message: "Registration options generated",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to generate registration options"
            )
        );
    }
}

export async function verifyRegistration(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    const parsedBody = verifyRegistrationBody.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString()
            )
        );
    }

    const { credential } = parsedBody.data;
    const user = req.user as User;

    // Only allow internal users to use passkeys
    if (user.type !== UserType.Internal) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                "Passkeys are only available for internal users"
            )
        );
    }

    try {
        // Get challenge from database
        const challengeData = await getChallenge(req.session.sessionId);
        
        if (!challengeData) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "No challenge found in session or challenge expired"
                )
            );
        }

        const verification = await verifyRegistrationResponse({
            response: credential,
            expectedChallenge: challengeData.challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            requireUserVerification: false
        });

        const { verified, registrationInfo } = verification;

        if (!verified || !registrationInfo) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Verification failed"
                )
            );
        }

        // Store the passkey in the database
        await db.insert(passkeys).values({
            credentialId: Buffer.from(registrationInfo.credentialID).toString('base64'),
            userId: user.userId,
            publicKey: Buffer.from(registrationInfo.credentialPublicKey).toString('base64'),
            signCount: registrationInfo.counter || 0,
            transports: credential.response.transports ? JSON.stringify(credential.response.transports) : null,
            name: challengeData.passkeyName,
            lastUsed: new Date().toISOString(),
            dateCreated: new Date().toISOString()
        });

        // Clear challenge data
        await clearChallenge(req.session.sessionId);

        return response<null>(res, {
            data: null,
            success: true,
            error: false,
            message: "Passkey registered successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to verify registration"
            )
        );
    }
}

export async function listPasskeys(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    const user = req.user as User;

    // Only allow internal users to use passkeys
    if (user.type !== UserType.Internal) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                "Passkeys are only available for internal users"
            )
        );
    }

    try {
        const userPasskeys = await db
            .select()
            .from(passkeys)
            .where(eq(passkeys.userId, user.userId));

        return response<typeof userPasskeys>(res, {
            data: userPasskeys,
            success: true,
            error: false,
            message: "Passkeys retrieved successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to retrieve passkeys"
            )
        );
    }
}

export async function deletePasskey(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    const { credentialId: encodedCredentialId } = req.params;
    const credentialId = decodeURIComponent(encodedCredentialId);
    const user = req.user as User;

    // Only allow internal users to use passkeys
    if (user.type !== UserType.Internal) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                "Passkeys are only available for internal users"
            )
        );
    }

    try {
        await db
            .delete(passkeys)
            .where(and(
                eq(passkeys.credentialId, credentialId),
                eq(passkeys.userId, user.userId)
            ));

        return response<null>(res, {
            data: null,
            success: true,
            error: false,
            message: "Passkey deleted successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to delete passkey"
            )
        );
    }
}

export async function startAuthentication(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    const parsedBody = startAuthenticationBody.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString()
            )
        );
    }

    const { email } = parsedBody.data;

    try {
        let allowCredentials: Array<{
            id: Buffer;
            type: 'public-key';
            transports?: string[];
        }> = [];
        let userId;

        // If email is provided, get passkeys for that specific user
        if (email) {
            const [user] = await db
                .select()
                .from(users)
                .where(eq(users.email, email))
                .limit(1);

            if (!user || user.type !== UserType.Internal) {
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "No passkeys available for this user"
                    )
                );
            }

            userId = user.userId;

            const userPasskeys = await db
                .select()
                .from(passkeys)
                .where(eq(passkeys.userId, user.userId));

            if (userPasskeys.length === 0) {
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "No passkeys registered for this user"
                    )
                );
            }

            allowCredentials = userPasskeys.map(key => ({
                id: Buffer.from(key.credentialId, 'base64'),
                type: 'public-key' as const,
                transports: key.transports ? JSON.parse(key.transports) : undefined
            }));
        } else {
            // If no email provided, allow any passkey (for resident key authentication)
            allowCredentials = [];
        }

        const options: GenerateAuthenticationOptionsOpts = {
            rpID,
            allowCredentials,
            userVerification: 'preferred',
        };

        const authenticationOptions = await generateAuthenticationOptions(options);

        // Generate a temporary session ID for unauthenticated users
        const tempSessionId = email ? `temp_${email}_${Date.now()}` : `temp_${Date.now()}`;

        // Store challenge in database
        await storeChallenge(tempSessionId, authenticationOptions.challenge, undefined, userId);

        return response(res, {
            data: { ...authenticationOptions, tempSessionId },
            success: true,
            error: false,
            message: "Authentication options generated",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to generate authentication options"
            )
        );
    }
}

export async function verifyAuthentication(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    const parsedBody = verifyAuthenticationBody.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString()
            )
        );
    }

    const { credential } = parsedBody.data;
    const tempSessionId = req.headers['x-temp-session-id'] as string;

    if (!tempSessionId) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                "Missing temp session ID"
            )
        );
    }

    try {
        // Get challenge from database
        const challengeData = await getChallenge(tempSessionId);
        
        if (!challengeData) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "No challenge found or challenge expired"
                )
            );
        }

        // Find the passkey in database
        const credentialId = Buffer.from(credential.id, 'base64').toString('base64');
        const [passkey] = await db
            .select()
            .from(passkeys)
            .where(eq(passkeys.credentialId, credentialId))
            .limit(1);

        if (!passkey) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Passkey not found"
                )
            );
        }

        // Get the user
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.userId, passkey.userId))
            .limit(1);

        if (!user || user.type !== UserType.Internal) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "User not found or not authorized for passkey authentication"
                )
            );
        }

        const verification = await verifyAuthenticationResponse({
            response: credential,
            expectedChallenge: challengeData.challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            authenticator: {
                credentialID: Buffer.from(passkey.credentialId, 'base64'),
                credentialPublicKey: Buffer.from(passkey.publicKey, 'base64'),
                counter: passkey.signCount,
                transports: passkey.transports ? JSON.parse(passkey.transports) : undefined
            },
            requireUserVerification: false
        });

        const { verified, authenticationInfo } = verification;

        if (!verified) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Authentication failed"
                )
            );
        }

        // Update sign count
        await db
            .update(passkeys)
            .set({
                signCount: authenticationInfo.newCounter,
                lastUsed: new Date().toISOString()
            })
            .where(eq(passkeys.credentialId, credentialId));

        // Create session for the user
        const { createSession, generateSessionToken, serializeSessionCookie } = await import("@server/auth/sessions/app");
        const token = generateSessionToken();
        const session = await createSession(token, user.userId);
        const isSecure = req.protocol === "https";
        const cookie = serializeSessionCookie(
            token,
            isSecure,
            new Date(session.expiresAt)
        );

        res.setHeader("Set-Cookie", cookie);

        // Clear challenge data
        await clearChallenge(tempSessionId);

        return response<null>(res, {
            data: null,
            success: true,
            error: false,
            message: "Authentication successful",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to verify authentication"
            )
        );
    }
} 