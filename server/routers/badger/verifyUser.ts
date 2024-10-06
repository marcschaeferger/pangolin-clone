import lucia from "@server/auth";
import HttpCode from "@server/types/HttpCode";
import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { response } from "@server/utils/response";

export const verifyUserBody = z.object({
    sessionId: z.string(),
});

export type VerifyUserBody = z.infer<typeof verifyUserBody>;

export type VerifyUserResponse = {
    valid: boolean;
};

export async function verifyUser(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<any> {
    const parsedBody = verifyUserBody.safeParse(req.query);

    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString(),
            ),
        );
    }

    const { sessionId } = parsedBody.data;

    try {
        const { session, user } = await lucia.validateSession(sessionId);

        if (!session || !user) {
            return next(
                createHttpError(HttpCode.UNAUTHORIZED, "Invalid session"),
            );
        }

        return response<VerifyUserResponse>(res, {
            data: { valid: true },
            success: true,
            error: false,
            message: "Access allowed",
            status: HttpCode.OK,
        });
    } catch (e) {
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to check user",
            ),
        );
    }
}
