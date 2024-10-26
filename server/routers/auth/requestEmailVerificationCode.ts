import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";
import { response } from "@server/utils";
import { User } from "@server/db/schema";
import { sendEmailVerificationCode } from "./sendEmailVerificationCode";
import config from "@server/config";

export type RequestEmailVerificationCodeResponse = {
    codeSent: boolean;
};

export async function requestEmailVerificationCode(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    if (!config.flags?.require_email_verification) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                "Email verification is not enabled"
            )
        );
    }

    try {
        const user = req.user as User;

        if (user.emailVerified) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Email is already verified"
                )
            );
        }

        await sendEmailVerificationCode(user.email, user.userId);

        return response<RequestEmailVerificationCodeResponse>(res, {
            data: {
                codeSent: true,
            },
            status: HttpCode.OK,
            success: true,
            error: false,
            message: `Email verification code sent to ${user.email}`,
        });
    } catch (error) {
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Failed to send email verification code"
            )
        );
    }
}

export default requestEmailVerificationCode;
