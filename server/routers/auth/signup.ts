import { NextFunction, Request, Response } from "express";
import db from "@server/db";
import { hash } from "@node-rs/argon2";
import HttpCode from "@server/types/HttpCode";
import { z } from "zod";
import { userActions, users } from "@server/db/schema";
import { fromError } from "zod-validation-error";
import createHttpError from "http-errors";
import response from "@server/utils/response";
import { SqliteError } from "better-sqlite3";
import { sendEmailVerificationCode } from "../../auth/sendEmailVerificationCode";
import { passwordSchema } from "@server/auth/passwordSchema";
import { eq } from "drizzle-orm";
import moment from "moment";
import {
    createSession,
    generateId,
    generateSessionToken,
    serializeSessionCookie,
} from "@server/auth";
import { ActionsEnum } from "@server/auth/actions";
import config from "@server/config";
import logger from "@server/logger";
import { hashPassword } from "@server/auth/password";

export const signupBodySchema = z.object({
    email: z.string().email(),
    password: passwordSchema,
});

export type SignUpBody = z.infer<typeof signupBodySchema>;

export type SignUpResponse = {
    emailVerificationRequired?: boolean;
};

export async function signup(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    const parsedBody = signupBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString()
            )
        );
    }

    const { email, password } = parsedBody.data;

    const passwordHash = await hashPassword(password);
    const userId = generateId(15);

    try {
        const existing = await db
            .select()
            .from(users)
            .where(eq(users.email, email));

        if (existing && existing.length > 0) {
            if (!config.flags?.require_email_verification) {
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "A user with that email address already exists"
                    )
                );
            }

            const user = existing[0];

            // If the user is already verified, we don't want to create a new user
            if (user.emailVerified) {
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "A user with that email address already exists"
                    )
                );
            }

            const dateCreated = moment(user.dateCreated);
            const now = moment();
            const diff = now.diff(dateCreated, "hours");

            if (diff < 2) {
                // If the user was created less than 2 hours ago, we don't want to create a new user
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "A verification email was already sent to this email address. Please check your email for the verification code."
                    )
                );
            } else {
                // If the user was created more than 2 hours ago, we want to delete the old user and create a new one
                await db.delete(users).where(eq(users.userId, user.userId));
            }
        }

        await db.insert(users).values({
            userId: userId,
            email: email,
            passwordHash,
            dateCreated: moment().toISOString(),
        });

        // give the user their default permissions:
        // await db.insert(userActions).values({
        //     userId: userId,
        //     actionId: ActionsEnum.createOrg,
        //     orgId: null,
        // });

        const token = generateSessionToken();
        await createSession(token, userId);
        const cookie = serializeSessionCookie(token);
        res.appendHeader("Set-Cookie", cookie);

        if (config.flags?.require_email_verification) {
            sendEmailVerificationCode(email, userId);

            return response<SignUpResponse>(res, {
                data: {
                    emailVerificationRequired: true,
                },
                success: true,
                error: false,
                message: `User created successfully. We sent an email to ${email} with a verification code.`,
                status: HttpCode.OK,
            });
        }

        return response<SignUpResponse>(res, {
            data: {},
            success: true,
            error: false,
            message: "User created successfully",
            status: HttpCode.OK,
        });
    } catch (e) {
        if (e instanceof SqliteError && e.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "A user with that email address already exists"
                )
            );
        } else {
            logger.error(e);
            return next(
                createHttpError(
                    HttpCode.INTERNAL_SERVER_ERROR,
                    "Failed to create user"
                )
            );
        }
    }
}
