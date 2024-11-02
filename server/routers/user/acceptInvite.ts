import { verify } from "@node-rs/argon2";
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { roles, userInvites, userOrgs, users } from "@server/db/schema";
import { eq } from "drizzle-orm";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";

const acceptInviteBodySchema = z.object({
    token: z.string(),
    inviteId: z.string(),
});

export type AcceptInviteResponse = {};

export async function acceptInvite(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedBody = acceptInviteBodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { token, inviteId } = parsedBody.data;

        const existingInvite = await db
            .select()
            .from(userInvites)
            .where(eq(userInvites.inviteId, inviteId))
            .limit(1);

        if (!existingInvite.length) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Invite ID or token is invalid"
                )
            );
        }

        const validToken = await verify(existingInvite[0].tokenHash, token, {
            memoryCost: 19456,
            timeCost: 2,
            outputLen: 32,
            parallelism: 1,
        });
        if (!validToken) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Invite ID or token is invalid"
                )
            );
        }

        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, existingInvite[0].email))
            .limit(1);
        if (!existingUser.length) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "User does not exist. Please create an account first."
                )
            );
        }

        let roleId: number;
        // get the role to make sure it exists
        const existingRole = await db
            .select()
            .from(roles)
            .where(eq(roles.roleId, existingInvite[0].roleId))
            .limit(1);
        if (existingRole.length) {
            roleId = existingRole[0].roleId;
        } else {
            // TODO: use the default role on the org instead of failing
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Role does not exist. Please contact an admin."
                )
            );
        }

        // add the user to the org
        await db.insert(userOrgs).values({
            userId: existingUser[0].userId,
            orgId: existingInvite[0].orgId,
            roleId: existingInvite[0].roleId,
        });

        // delete the invite
        await db.delete(userInvites).where(eq(userInvites.inviteId, inviteId));

        return response<AcceptInviteResponse>(res, {
            data: {},
            success: true,
            error: false,
            message: "Invite accepted",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
