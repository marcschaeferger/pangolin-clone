import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import { OpenAPITags, registry } from "@server/openApi";
import config from "@server/lib/config";
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

export type CreateIdpOrgPolicyResponse = {};

registry.registerPath({
    method: "put",
    path: "/idp/{idpId}/org/{orgId}",
    description: "Create an IDP policy for an existing IDP on an organization.",
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

export async function createIdpOrgPolicy(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedBody = bodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const parsedParams = paramsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { idpId, orgId } = parsedParams.data;
        const { roleMapping, orgMapping } = parsedBody.data;

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

        if (existing.idpOrg) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "An IDP org policy already exists."
                )
            );
        }

        await db.insert(idpOrg).values({
            idpId,
            orgId,
            roleMapping,
            orgMapping
        });

        return response<CreateIdpOrgPolicyResponse>(res, {
            data: {},
            success: true,
            error: false,
            message: "Idp created successfully",
            status: HttpCode.CREATED
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
