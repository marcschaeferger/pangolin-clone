import { NextFunction, Request, Response } from "express";
import db from "@server/db";
import { hash } from "@node-rs/argon2";
import HttpCode from "@server/types/HttpCode";
import { z } from "zod";
import { generateId } from "lucia";
import { users } from "@server/db/schema";
import lucia from "@server/auth";
import { fromError } from "zod-validation-error";
import createHttpError from "http-errors";
import response from "@server/utils/response";
import { SqliteError } from "better-sqlite3";

export const signupBodySchema = z.object({
    email: z.string().email(),
    password: z
        .string()
        .min(8, { message: "Password must be at least 8 characters long" })
        .max(31, { message: "Password must be at most 31 characters long" })
        .regex(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).*$/, {
            message: `Your password must meet the following conditions:
- At least one uppercase English letter.
- At least one lowercase English letter.
- At least one digit.
- At least one special character.`,
        }),
});

export type SignUpBody = z.infer<typeof signupBodySchema>;

export async function signup(req: Request, res: Response, next: NextFunction): Promise<any> {
    const parsedBody = signupBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString(),
            ),
        );
    }

    const { email, password } = parsedBody.data;

    const passwordHash = await hash(password, {
        // recommended minimum parameters
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
    });
    const userId = generateId(15);

    try {
        await db.insert(users).values({
            id: userId,
            email: email,
            passwordHash,
        });

        const session = await lucia.createSession(userId, {});
        res.appendHeader(
            "Set-Cookie",
            lucia.createSessionCookie(session.id).serialize(),
        );

        return res.status(HttpCode.OK).send(
            response<null>({
                data: null,
                success: true,
                error: false,
                message: "User created successfully",
                status: HttpCode.OK,
            }),
        );
    } catch (e) {
        if (e instanceof SqliteError && e.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "A user with that email address already exists",
                ),
            );
        } else {
            return next(
                createHttpError(
                    HttpCode.INTERNAL_SERVER_ERROR,
                    "Failed to create user",
                ),
            );
        }
    }
}
