import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import { OpenAPITags, registry } from "@server/openApi";
import { eq, and } from "drizzle-orm";
import { idp, idpOrg } from "@server/db";

const paramsSchema = z
    .object({
        idpId: z.coerce.number(),
        orgId: z.string()
    })
    .strict();

const bodySchema = z
    .object({
        roleMapping: z.string().optional(),
        orgMapping: z.string().optional()
    })
    .strict();

export type UpdateIdpOrgPolicyResponse = {};

registry.registerPath({
    method: "post",
    path: "/idp/{idpId}/org/{orgId}",
    description: "Update an IDP org policy.",
    tags: [OpenAPITags.Idp],
    request: {
        params: paramsSchema,
        body: {
            content: {
                "application/json": {
                    schema: bodySchema
                }
            }
        }
    },
    responses: {}
});

export async function updateIdpOrgPolicy(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = paramsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const parsedBody = bodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { idpId, orgId } = parsedParams.data;
        const { roleMapping, orgMapping } = parsedBody.data;

        // Check if IDP and policy exist
        const [existing] = await db
            .select()
            .from(idp)
            .leftJoin(
                idpOrg,
                and(eq(idpOrg.orgId, orgId), eq(idpOrg.idpId, idpId))
            )
            .where(eq(idp.idpId, idpId));

        if (!existing?.idp) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "An IDP with this ID does not exist."
                )
            );
        }

        if (!existing.idpOrg) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "A policy for this IDP and org does not exist."
                )
            );
        }

        // Update the policy
        await db
            .update(idpOrg)
            .set({
                roleMapping,
                orgMapping
            })
            .where(and(eq(idpOrg.idpId, idpId), eq(idpOrg.orgId, orgId)));

        return response<UpdateIdpOrgPolicyResponse>(res, {
            data: {},
            success: true,
            error: false,
            message: "Policy updated successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
