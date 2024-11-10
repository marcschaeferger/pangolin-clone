import { NextFunction, Request, Response } from "express";
import db from "@server/db";
import { hash } from "@node-rs/argon2";
import HttpCode from "@server/types/HttpCode";
import { z } from "zod";
import { newts } from "@server/db/schema";
import createHttpError from "http-errors";
import response from "@server/utils/response";
import { SqliteError } from "better-sqlite3";
import moment from "moment";
import {
    generateId,
    generateSessionToken,
} from "@server/auth";
import { createNewtSession } from "@server/auth/newt";

export const createNewtBodySchema = z.object({});

export type CreateNewtBody = z.infer<typeof createNewtBodySchema>;

export type CreateNewtResponse = {
    token: string;
    newtId: string;
    secret: string;
};

export async function createNewt(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {

        // generate a newtId and secret
        const secret = generateId(48);
        const secretHash = await hash(secret, {
            memoryCost: 19456,
            timeCost: 2,
            outputLen: 32,
            parallelism: 1,
        });

        const newtId = generateId(15);

        await db.insert(newts).values({
            newtId: newtId,
            secretHash,
            dateCreated: moment().toISOString(),
        });

        // give the newt their default permissions:
        // await db.insert(newtActions).values({
        //     newtId: newtId,
        //     actionId: ActionsEnum.createOrg,
        //     orgId: null,
        // });

        const token = generateSessionToken();
        await createNewtSession(token, newtId);

        return response<CreateNewtResponse>(res, {
            data: {
                newtId,
                secret,
                token,
            },
            success: true,
            error: false,
            message: "Newt created successfully",
            status: HttpCode.OK,
        });
    } catch (e) {
        if (e instanceof SqliteError && e.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "A newt with that email address already exists"
                )
            );
        } else {
            console.error(e);
            
            return next(
                createHttpError(
                    HttpCode.INTERNAL_SERVER_ERROR,
                    "Failed to create newt"
                )
            );
        }
    }
}
