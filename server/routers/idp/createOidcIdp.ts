import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import { OpenAPITags, registry } from "@server/openApi";
import { idp, idpOidcConfig, idpOrg, orgs } from "@server/db/schemas";
import { eq } from "drizzle-orm";
import { generateOidcUrl } from "./generateOidcUrl";
import { generateOidcRedirectUrl } from "@server/lib/idp/generateRedirectUrl";

const paramsSchema = z
    .object({
        orgId: z.string()
    })
    .strict();

const bodySchema = z
    .object({
        clientId: z.string().nonempty(),
        clientSecret: z.string().nonempty(),
        authUrl: z.string().url(),
        tokenUrl: z.string().url(),
        autoProvision: z.boolean(),
        identifierPath: z.string().nonempty(),
        emailPath: z.string().optional(),
        namePath: z.string().optional(),
        roleMapping: z.string().optional(),
        scopes: z.array(z.string().nonempty())
    })
    .strict();

export type CreateIdpResponse = {
    idpId: number;
    redirectUrl: string;
};

registry.registerPath({
    method: "put",
    path: "/org/{orgId}/idp/oidc",
    description: "Create an OIDC IdP for an organization.",
    tags: [OpenAPITags.Org, OpenAPITags.Idp],
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

export async function createOidcIdp(
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

        const { orgId } = parsedParams.data;

        const {
            clientId,
            clientSecret,
            authUrl,
            tokenUrl,
            scopes,
            identifierPath,
            emailPath,
            namePath,
            roleMapping,
            autoProvision
        } = parsedBody.data;

        // Check if the org exists
        const [org] = await db.select().from(orgs).where(eq(orgs.orgId, orgId));

        if (!org) {
            return next(
                createHttpError(HttpCode.NOT_FOUND, "Organization not found")
            );
        }

        let idpId: number | undefined;
        await db.transaction(async (trx) => {
            const [idpRes] = await trx
                .insert(idp)
                .values({
                    type: "oidc"
                })
                .returning();

            idpId = idpRes.idpId;

            await trx.insert(idpOidcConfig).values({
                idpId: idpRes.idpId,
                clientId,
                clientSecret,
                authUrl,
                tokenUrl,
                autoProvision,
                scopes: JSON.stringify(scopes),
                identifierPath,
                emailPath,
                namePath,
                roleMapping
            });

            await trx.insert(idpOrg).values({
                idpId: idpRes.idpId,
                orgId
            });
        });

        const redirectUrl = generateOidcRedirectUrl(orgId, idpId as number);

        return response<CreateIdpResponse>(res, {
            data: {
                idpId: idpId as number,
                redirectUrl
            },
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
