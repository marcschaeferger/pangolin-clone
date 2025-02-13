import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { orgs, resources, sites } from "@server/db/schema";
import { eq, or, and } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import config from "@server/lib/config";
import { subdomainSchema } from "@server/lib/schemas";

const updateResourceParamsSchema = z
    .object({
        resourceId: z
            .string()
            .transform(Number)
            .pipe(z.number().int().positive())
    })
    .strict();

const updateResourceBodySchema = z
    .object({
        name: z.string().min(1).max(255).optional(),
        subdomain: subdomainSchema.optional(),
        ssl: z.boolean().optional(),
        sso: z.boolean().optional(),
        blockAccess: z.boolean().optional(),
        proxyPort: z.number().int().min(1).max(65535).optional(),
        emailWhitelistEnabled: z.boolean().optional(),
        isBaseDomain: z.boolean().optional(),
        applyRules: z.boolean().optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update"
    })
    .refine(
        (data) => {
            if (!config.getRawConfig().flags?.allow_raw_resources) {
                if (data.proxyPort !== undefined) {
                    return false;
                }
            }
            return true;
        },
        { message: "Cannot update proxyPort" }
    )
    // .refine(
    //     (data) => {
    //         if (data.proxyPort === 443 || data.proxyPort === 80) {
    //             return false;
    //         }
    //         return true;
    //     },
    //     {
    //         message: "Port 80 and 443 are reserved for http and https resources"
    //     }
    // )
    .refine(
        (data) => {
            if (!config.getRawConfig().flags?.allow_base_domain_resources) {
                if (data.isBaseDomain) {
                    return false;
                }
            }
            return true;
        },
        {
            message: "Base domain resources are not allowed"
        }
    );

export async function updateResource(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = updateResourceParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const parsedBody = updateResourceBodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const { resourceId } = parsedParams.data;
        const updateData = parsedBody.data;

        const [result] = await db
            .select()
            .from(resources)
            .where(eq(resources.resourceId, resourceId))
            .leftJoin(orgs, eq(resources.orgId, orgs.orgId));

        const resource = result.resources;
        const org = result.orgs;

        if (!resource || !org) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Resource with ID ${resourceId} not found`
                )
            );
        }

        if (updateData.subdomain) {
            if (!resource.http) {
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "Cannot update subdomain for non-http resource"
                    )
                );
            }

            const valid = subdomainSchema.safeParse(
                updateData.subdomain
            ).success;
            if (!valid) {
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "Invalid subdomain provided"
                    )
                );
            }
        }

        if (updateData.proxyPort) {
            const proxyPort = updateData.proxyPort;
            const existingResource = await db
                .select()
                .from(resources)
                .where(
                    and(
                        eq(resources.protocol, resource.protocol),
                        eq(resources.proxyPort, proxyPort!)
                    )
                );

            if (
                existingResource.length > 0 &&
                existingResource[0].resourceId !== resourceId
            ) {
                return next(
                    createHttpError(
                        HttpCode.CONFLICT,
                        "Resource with that protocol and port already exists"
                    )
                );
            }
        }

        if (!org?.domain) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Resource does not have a domain"
                )
            );
        }

        let fullDomain: string | undefined;
        if (updateData.isBaseDomain) {
            fullDomain = org.domain;
        } else if (updateData.subdomain) {
            fullDomain = `${updateData.subdomain}.${org.domain}`;
        }

        const updatePayload = {
            ...updateData,
            ...(fullDomain && { fullDomain })
        };

        if (
            fullDomain &&
            (updatePayload.subdomain !== undefined ||
                updatePayload.isBaseDomain !== undefined)
        ) {
            const [existingDomain] = await db
                .select()
                .from(resources)
                .where(eq(resources.fullDomain, fullDomain));

            if (existingDomain && existingDomain.resourceId !== resourceId) {
                return next(
                    createHttpError(
                        HttpCode.CONFLICT,
                        "Resource with that domain already exists"
                    )
                );
            }
        }

        const updatedResource = await db
            .update(resources)
            .set(updatePayload)
            .where(eq(resources.resourceId, resourceId))
            .returning();

        if (updatedResource.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Resource with ID ${resourceId} not found`
                )
            );
        }

        return response(res, {
            data: updatedResource[0],
            success: true,
            error: false,
            message: "Resource updated successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
