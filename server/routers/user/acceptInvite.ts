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
import { isWithinExpirationDate } from "oslo";
import { verifyPassword } from "@server/auth/password";
import { checkValidInvite } from "@server/auth/checkValidInvite";

const acceptInviteBodySchema = z
    .object({
        token: z.string(),
        inviteId: z.string()
    })
    .strict();

export type AcceptInviteResponse = {
    accepted: boolean;
    orgId: string;
};

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

        const { error, existingInvite } = await checkValidInvite({
            token,
            inviteId
        });

        if (error) {
            return next(createHttpError(HttpCode.BAD_REQUEST, error));
        }

        if (!existingInvite) {
            return next(
                createHttpError(HttpCode.BAD_REQUEST, "Invite does not exist")
            );
        }

        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, existingInvite.email))
            .limit(1);
        if (!existingUser.length) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "User does not exist. Please create an account first."
                )
            );
        }

        if (req.user && req.user.email !== existingInvite.email) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Invite is not for this user"
                )
            );
        }

        let roleId: number;
        // get the role to make sure it exists
        const existingRole = await db
            .select()
            .from(roles)
            .where(eq(roles.roleId, existingInvite.roleId))
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

        await db.transaction(async (trx) => {
            // add the user to the org
            await trx.insert(userOrgs).values({
                userId: existingUser[0].userId,
                orgId: existingInvite.orgId,
                roleId: existingInvite.roleId
            });

            // delete the invite
            await trx
                .delete(userInvites)
                .where(eq(userInvites.inviteId, inviteId));
        });

        return response<AcceptInviteResponse>(res, {
            data: { accepted: true, orgId: existingInvite.orgId },
            success: true,
            error: false,
            message: "Invite accepted",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
