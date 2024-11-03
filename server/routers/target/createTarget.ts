import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { resources, sites, targets } from "@server/db/schema";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import { ActionsEnum, checkUserActionPermission } from "@server/auth/actions";
import logger from "@server/logger";
import { addPeer } from "../gerbil/peers";
import { eq, and } from "drizzle-orm";
import { isIpInCidr } from "@server/utils/ip";
import { fromError } from "zod-validation-error";

const createTargetParamsSchema = z.object({
    resourceId: z.string().transform(Number).pipe(z.number().int().positive()),
});

const createTargetSchema = z.object({
    ip: z.string().ip(),
    method: z.string().min(1).max(10),
    port: z.number().int().min(1).max(65535),
    protocol: z.string().optional(),
    enabled: z.boolean().default(true),
});

export async function createTarget(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedBody = createTargetSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const targetData = parsedBody.data;

        const parsedParams = createTargetParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { resourceId } = parsedParams.data;

        // Check if the user has permission to list sites
        const hasPermission = await checkUserActionPermission(
            ActionsEnum.createTarget,
            req
        );
        if (!hasPermission) {
            return next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "User does not have permission to perform this action"
                )
            );
        }

        // get the resource
        const [resource] = await db
            .select({
                siteId: resources.siteId,
            })
            .from(resources)
            .where(eq(resources.resourceId, resourceId));

        if (!resource) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Resource with ID ${resourceId} not found`
                )
            );
        }

        // TODO: is this all inefficient?

        // get the site
        const [site] = await db
            .select()
            .from(sites)
            .where(eq(sites.siteId, resource.siteId!))
            .limit(1);

        if (!site) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Site with ID ${resource.siteId} not found`
                )
            );
        }

        // make sure the target is within the site subnet
        if (!isIpInCidr(targetData.ip, site.subnet!)) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    `Target IP is not within the site subnet`
                )
            );
        }

        const newTarget = await db
            .insert(targets)
            .values({
                resourceId,
                ...targetData,
            })
            .returning();

        // Fetch resources for this site
        const resourcesRes = await db.query.resources.findMany({
            where: eq(resources.siteId, site.siteId),
        });

        // Fetch targets for all resources of this site
        const targetIps = await Promise.all(
            resourcesRes.map(async (resource) => {
                const targetsRes = await db.query.targets.findMany({
                    where: eq(targets.resourceId, resource.resourceId),
                });
                return targetsRes.map((target) => `${target.ip}/32`);
            })
        );

        await addPeer(site.exitNodeId!, {
            publicKey: site.pubKey,
            allowedIps: targetIps.flat(),
        });

        return response(res, {
            data: newTarget[0],
            success: true,
            error: false,
            message: "Target created successfully",
            status: HttpCode.CREATED,
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "An error occurred..."
            )
        );
    }
}
