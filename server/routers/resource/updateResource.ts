import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import {
    domains,
    Org,
    orgDomains,
    orgs,
    Resource,
    resources,
    resourceHostnames
} from "@server/db";
import { eq, and, ne } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import config from "@server/lib/config";
import { tlsNameSchema } from "@server/lib/schemas";
import { subdomainSchema } from "@server/lib/schemas";
import { registry } from "@server/openApi";
import { OpenAPITags } from "@server/openApi";
import { DomainValidationResult, validateAndConstructDomain } from "@server/lib/domainUtils";
import { validateHeaders } from "@server/lib/validators";

const updateResourceParamsSchema = z
    .object({
        resourceId: z
            .string()
            .transform(Number)
            .pipe(z.number().int().positive())
    })
    .strict();

const hostnameUpdateSchema = z.object({
    hostnameId: z.number().int().positive().optional(),
    domainId: z.string().nonempty(),
    subdomain: z.string().optional(),
    baseDomain: z.string().optional(),
    fullDomain: z.string().optional(),
    primary: z.boolean().default(false),
    _delete: z.boolean().optional()
});

const updateHttpResourceBodySchema = z
    .object({
        name: z.string().min(1).max(255).optional(),
        subdomain: subdomainSchema.nullable().optional(),
        ssl: z.boolean().optional(),
        sso: z.boolean().optional(),
        blockAccess: z.boolean().optional(),
        emailWhitelistEnabled: z.boolean().optional(),
        applyRules: z.boolean().optional(),
        domainId: z.string().optional(),
        enabled: z.boolean().optional(),
        stickySession: z.boolean().optional(),
        tlsServerName: z.string().nullable().optional(),
        setHostHeader: z.string().nullable().optional(),
        skipToIdpId: z.number().int().positive().nullable().optional(),
        headers: z.array(z.object({ name: z.string(), value: z.string() })).nullable().optional(),
        hostMode: z.enum(["multi", "redirect"]).optional(),
        hostnames: z.array(hostnameUpdateSchema).optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update"
    })
    .refine(
        (data) => {
            if (data.subdomain) {
                return subdomainSchema.safeParse(data.subdomain).success;
            }
            return true;
        },
        { message: "Invalid subdomain" }
    )
    .refine(
        (data) => {
            if (data.tlsServerName) {
                return tlsNameSchema.safeParse(data.tlsServerName).success;
            }
            return true;
        },
        {
            message:
                "Invalid TLS Server Name. Use domain name format, or save empty to remove the TLS Server Name."
        }
    )
    .refine(
        (data) => {
            if (data.setHostHeader) {
                return tlsNameSchema.safeParse(data.setHostHeader).success;
            }
            return true;
        },
        {
            message:
                "Invalid custom Host Header value. Use domain name format, or save empty to unset custom Host Header."
        }
    )
    .refine(
        (data) => {
            // If hostnames are provided, ensure exactly one is primary (excluding deleted ones)
            if (data.hostnames && data.hostnames.length > 0) {
                const nonDeletedHostnames = data.hostnames.filter(h => !h._delete);
                const primaryCount = nonDeletedHostnames.filter(h => h.primary).length;
                return nonDeletedHostnames.length === 0 || primaryCount === 1;
            }
            return true;
        },
        { message: "Exactly one hostname must be marked as primary" }

    );

export type UpdateResourceResponse = Resource & {
    hostnames?: Array<{
        hostnameId: number;
        domainId: string;
        subdomain?: string;
        fullDomain: string;
        baseDomain: string;
        primary: boolean;
    }>;
};

const updateRawResourceBodySchema = z
    .object({
        name: z.string().min(1).max(255).optional(),
        proxyPort: z.number().int().min(1).max(65535).optional(),
        stickySession: z.boolean().optional(),
        enabled: z.boolean().optional()
        // enableProxy: z.boolean().optional() // always true now
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
    );

registry.registerPath({
    method: "post",
    path: "/resource/{resourceId}",
    description: "Update a resource.",
    tags: [OpenAPITags.Resource],
    request: {
        params: updateResourceParamsSchema,
        body: {
            content: {
                "application/json": {
                    schema: updateHttpResourceBodySchema.and(
                        updateRawResourceBodySchema
                    )
                }
            }
        }
    },
    responses: {}
});

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

        const { resourceId } = parsedParams.data;

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

        if (resource.http) {
            // HANDLE UPDATING HTTP RESOURCES
            return await updateHttpResource(
                {
                    req,
                    res,
                    next
                },
                {
                    resource,
                    org
                }
            );
        } else {
            // HANDLE UPDATING RAW TCP/UDP RESOURCES
            return await updateRawResource(
                {
                    req,
                    res,
                    next
                },
                {
                    resource,
                    org
                }
            );
        }
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}

async function updateHttpResource(
    route: {
        req: Request;
        res: Response;
        next: NextFunction;
    },
    meta: {
        resource: Resource;
        org: Org;
    }
) {
    const { next, req, res } = route;
    const { resource, org } = meta;

    try {

        const parsedBody = updateHttpResourceBodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }
        const updateData = parsedBody.data;

        // Handle legacy single domain update
        if (updateData.domainId && !updateData.hostnames) {
            const legacyHostname = {
                domainId: updateData.domainId,
                subdomain: updateData.subdomain,
                primary: true
            };
            
            const legacyValidation = await validateAndConstructDomain(legacyHostname, resource.orgId);
            if (!legacyValidation.success) {
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        legacyValidation.error
                    )
                );
            }

            const legacyResult = await updateLegacyDomain(updateData, resource, legacyValidation.data!, next);
            if (!legacyResult.success) {
                return;
            }
        }

        // Handle multiple hostnames update
        if (updateData.hostnames) {
            // Validate all hostnames first using the proper validation function
            const validationResults: DomainValidationResult[] = [];
            for (const hostname of updateData.hostnames) {
                if (!hostname._delete) {
                    const result = await validateAndConstructDomain(hostname, resource.orgId);
                    validationResults.push(result);
                    if (!result.success) {
                        return next(
                            createHttpError(
                                HttpCode.BAD_REQUEST,
                                result.error
                            )
                        );
                    }
                }
            }

            const hostnamesResult = await updateResourceHostnames(
                resource.resourceId,
                updateData.hostnames,
                validationResults,
                resource.orgId,
                next
            );
            if (!hostnamesResult.success) {
                return;
            }
        }

        // Prepare resource update data
        const { hostnames, domainId, subdomain, hostMode, ...otherUpdates } = updateData;

        const resourceUpdateData: Partial<Resource> = {
            ...otherUpdates,
            headers: updateData.headers ? JSON.stringify(updateData.headers) : undefined
        };

        if (hostMode) {
            resourceUpdateData.hostMode = hostMode;
        }

        // If hostnames were updated, update primary hostname for backward compatibility
        if (updateData.hostnames) {
            const currentHostnames = await db
                .select()
                .from(resourceHostnames)
                .where(eq(resourceHostnames.resourceId, resource.resourceId));

            const primaryHostname = currentHostnames.find(h => h.primary);
            if (primaryHostname) {
                resourceUpdateData.fullDomain = primaryHostname.fullDomain!;
                resourceUpdateData.domainId = primaryHostname.domainId;
                resourceUpdateData.subdomain = primaryHostname.subdomain || null;
            }
        }

        // Update the resource record only if there are updates
        let updatedResource = resource;
        if (Object.keys(resourceUpdateData).length > 0) {
            const updatedResources = await db
                .update(resources)
                .set(resourceUpdateData)
                .where(eq(resources.resourceId, resource.resourceId))
                .returning();

            if (updatedResources.length === 0) {
                return next(
                    createHttpError(
                        HttpCode.NOT_FOUND,
                        `Resource with ID ${resource.resourceId} not found`
                    )
                );
            }
            updatedResource = updatedResources[0];
        }

        // Get current hostnames for response
        const currentHostnames = await db
            .select()
            .from(resourceHostnames)
            .where(eq(resourceHostnames.resourceId, resource.resourceId));

        const responseHostnames: UpdateResourceResponse["hostnames"] = currentHostnames
            .filter(h => h.hostnameId !== undefined)
            .map(h => ({
                hostnameId: h.hostnameId!,
                domainId: h.domainId,
                subdomain: h.subdomain || undefined,
                fullDomain: h.fullDomain!,
                baseDomain: h.baseDomain!,
                primary: h.primary
            }));

        const responseData: UpdateResourceResponse = {
            ...updatedResource,
            hostnames: responseHostnames
        };

        return response(res, {
            data: responseData,
            success: true,
            error: false,
            message: "HTTP resource updated successfully",
            status: HttpCode.OK
        });
    } catch (err) {
        logger.error(err);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred"));
    }
}

async function updateResourceHostnames(
    resourceId: number,
    hostnames: Array<{
        hostnameId?: number;
        domainId: string;
        subdomain?: string;
        baseDomain?: string;
        fullDomain?: string;
        primary: boolean;
        _delete?: boolean;
    }>,
    validationResults: DomainValidationResult[],
    orgId: string,
    next: NextFunction
): Promise<{ success: boolean }> {
    try {
        // Separate new, updated, and deleted hostnames
        const toDelete = hostnames.filter(h => h._delete && h.hostnameId);
        const toUpdate = hostnames.filter(h => h.hostnameId && !h._delete);
        const toCreate = hostnames.filter(h => !h.hostnameId && !h._delete);

        // Create a map of validation results by domain info
        const validationMap = new Map<string, DomainValidationResult>();
        let validationIndex = 0;
        for (const hostname of hostnames) {
            if (!hostname._delete) {
                const key = `${hostname.domainId}-${hostname.subdomain || ''}`;
                validationMap.set(key, validationResults[validationIndex++]);
            }
        }

        await db.transaction(async (trx) => {
            // Delete hostnames marked for deletion
            for (const hostname of toDelete) {
                await trx.delete(resourceHostnames).where(eq(resourceHostnames.hostnameId, hostname.hostnameId!));
            }

            // Update existing hostnames
            for (const hostname of toUpdate) {
                const key = `${hostname.domainId}-${hostname.subdomain || ''}`;
                const validationResult = validationMap.get(key);
                if (!validationResult || !validationResult.success) {
                    throw new Error(`Validation failed for hostname: ${hostname.domainId}`);
                }

                const validatedData = validationResult.data!;

                await trx
                    .update(resourceHostnames)
                    .set({
                        domainId: validatedData.domainId,
                        subdomain: validatedData.subdomain,
                        fullDomain: validatedData.fullDomain,
                        baseDomain: validatedData.baseDomain,
                        primary: validatedData.primary
                    })
                    .where(eq(resourceHostnames.hostnameId, hostname.hostnameId!));
            }

            // Create new hostnames
            for (const hostname of toCreate) {
                const key = `${hostname.domainId}-${hostname.subdomain || ''}`;
                const validationResult = validationMap.get(key);
                if (!validationResult || !validationResult.success) {
                    throw new Error(`Validation failed for hostname: ${hostname.domainId}`);
                }

                const validatedData = validationResult.data!;

                // Check for conflicts - exclude current resource and its hostnames
                const existingResource = await db
                    .select()
                    .from(resources)
                    .where(and(
                        eq(resources.fullDomain, validatedData.fullDomain),
                        ne(resources.resourceId, resourceId)
                    ));

                const existingHostname = await db
                    .select()
                    .from(resourceHostnames)
                    .where(and(
                        eq(resourceHostnames.fullDomain, validatedData.fullDomain),
                        ne(resourceHostnames.resourceId, resourceId)
                    ));

                if (existingResource.length > 0 || existingHostname.length > 0) {
                    throw new Error(`Resource with domain ${validatedData.fullDomain} already exists`);
                }

                await trx.insert(resourceHostnames).values({
                    resourceId,
                    domainId: validatedData.domainId,
                    subdomain: validatedData.subdomain,
                    fullDomain: validatedData.fullDomain,
                    baseDomain: validatedData.baseDomain,
                    primary: validatedData.primary,
                });
            }
        });

        return { success: true };
    } catch (error) {
        logger.error('Error updating resource hostnames:', error);
        next(createHttpError(HttpCode.BAD_REQUEST, error || 'Failed to update hostnames'));
        return { success: false };
    }
}

async function updateLegacyDomain(
    updateData: any,
    resource: Resource,
    validatedData: {
        domainId: string;
        subdomain?: string | null;
        fullDomain: string;
        baseDomain: string;
        primary: boolean;
    },
    next: NextFunction
): Promise<{ success: boolean }> {
    try {
        const { fullDomain, subdomain: finalSubdomain } = validatedData;

        logger.debug(`Full domain: ${fullDomain}`);

        if (fullDomain) {
            // Exclude current resource from conflict check
            const [existingDomain] = await db
                .select()
                .from(resources)
                .where(
                    and(
                        eq(resources.fullDomain, fullDomain),
                        ne(resources.resourceId, resource.resourceId)
                    )
                );

            if (existingDomain) {
                next(
                    createHttpError(
                        HttpCode.CONFLICT,
                        "Resource with that domain already exists"
                    )
                );
                return { success: false };
            }

            // Update the full domain if it has changed
            await db
                .update(resources)
                .set({ fullDomain })
                .where(eq(resources.resourceId, resource.resourceId));
        }

        // Update the subdomain in the update data
        updateData.subdomain = finalSubdomain;

        return { success: true };
    } catch (error) {
        next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                error instanceof Error ? error.message : "Unknown error"
            )
        );
        return { success: false };
    }
}

async function updateRawResource(
    route: {
        req: Request;
        res: Response;
        next: NextFunction;
    },
    meta: {
        resource: Resource;
        org: Org;
    }
) {
    const { next, req, res } = route;
    const { resource } = meta;

    const parsedBody = updateRawResourceBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString()
            )
        );
    }

    const updateData = parsedBody.data;

    const updatedResource = await db
        .update(resources)
        .set(updateData)
        .where(eq(resources.resourceId, resource.resourceId))
        .returning();

    if (updatedResource.length === 0) {
        return next(
            createHttpError(
                HttpCode.NOT_FOUND,
                `Resource with ID ${resource.resourceId} not found`
            )
        );
    }

    return response(res, {
        data: updatedResource[0],
        success: true,
        error: false,
        message: "Non-http Resource updated successfully",
        status: HttpCode.OK
    });
}