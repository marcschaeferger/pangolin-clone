import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { resourcePassword, resources } from "@server/db/schema";
import { eq } from "drizzle-orm";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { fromError } from "zod-validation-error";
import { hash } from "@node-rs/argon2";
import { response } from "@server/utils";

const setResourceAuthMethodsParamsSchema = z.object({
    resourceId: z.string().transform(Number).pipe(z.number().int().positive()),
});

const setResourceAuthMethodsBodySchema = z
    .object({
        password: z.string().nullable(),
    })
    .strict();

export async function setResourcePassword(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = setResourceAuthMethodsParamsSchema.safeParse(
            req.params
        );
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const parsedBody = setResourceAuthMethodsBodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { resourceId } = parsedParams.data;
        const { password } = parsedBody.data;

        await db.transaction(async (trx) => {
            await trx
                .delete(resourcePassword)
                .where(eq(resourcePassword.resourceId, resourceId));

            if (password) {
                const passwordHash = await hash(password, {
                    memoryCost: 19456,
                    timeCost: 2,
                    outputLen: 32,
                    parallelism: 1,
                });

                await trx
                    .insert(resourcePassword)
                    .values({ resourceId, passwordHash });
            }
        });

        return response(res, {
            data: {},
            success: true,
            error: false,
            message: "Resource password set successfully",
            status: HttpCode.CREATED,
        });
    } catch (error) {
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
