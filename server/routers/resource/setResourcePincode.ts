import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { resourcePincode } from "@server/db/schema";
import { eq } from "drizzle-orm";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { fromError } from "zod-validation-error";
import { hash } from "@node-rs/argon2";
import { response } from "@server/lib";
import stoi from "@server/lib/stoi";
import logger from "@server/logger";
import { hashPassword } from "@server/auth/password";

const setResourceAuthMethodsParamsSchema = z.object({
    resourceId: z.string().transform(Number).pipe(z.number().int().positive()),
});

const setResourceAuthMethodsBodySchema = z
    .object({
        pincode: z
            .string()
            .regex(/^\d{6}$/)
            .or(z.null()),
    })
    .strict();

export async function setResourcePincode(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<any> {
    try {
        const parsedParams = setResourceAuthMethodsParamsSchema.safeParse(
            req.params,
        );
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString(),
                ),
            );
        }

        const parsedBody = setResourceAuthMethodsBodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString(),
                ),
            );
        }

        const { resourceId } = parsedParams.data;
        const { pincode } = parsedBody.data;

        await db.transaction(async (trx) => {
            await trx
                .delete(resourcePincode)
                .where(eq(resourcePincode.resourceId, resourceId));

            if (pincode) {
                const pincodeHash = await hashPassword(pincode);

                await trx
                    .insert(resourcePincode)
                    .values({ resourceId, pincodeHash, digitLength: 6 });
            }
        });

        return response(res, {
            data: {},
            success: true,
            error: false,
            message: "Resource PIN code set successfully",
            status: HttpCode.CREATED,
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "An error occurred",
            ),
        );
    }
}
