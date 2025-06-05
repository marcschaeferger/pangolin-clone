import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { newts, resources, sites, targets } from "@server/db";
import { eq } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { addPeer } from "../gerbil/peers";
import { fromError } from "zod-validation-error";
import { removeTargets } from "../newt/targets";
import { getAllowedIps } from "./helpers";
import { OpenAPITags, registry } from "@server/openApi";

const deleteTargetSchema = z
    .object({
        targetId: z.string().transform(Number).pipe(z.number().int().positive())
    })
    .strict();

registry.registerPath({
    method: "delete",
    path: "/target/{targetId}",
    description: "Delete a target.",
    tags: [OpenAPITags.Target],
    request: {
        params: deleteTargetSchema
    },
    responses: {}
});

export async function deleteTarget(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = deleteTargetSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { targetId } = parsedParams.data;

        const [deletedTarget] = await db
            .delete(targets)
            .where(eq(targets.targetId, targetId))
            .returning();

        if (!deletedTarget) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Target with ID ${targetId} not found`
                )
            );
        }
        // get the resource
        const [resource] = await db
            .select()
            .from(resources)
            .where(eq(resources.resourceId, deletedTarget.resourceId!));

        if (!resource) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Resource with ID ${deletedTarget.resourceId} not found`
                )
            );
        }

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

        if (site.pubKey) {
            if (site.type == "wireguard") {
                await addPeer(site.exitNodeId!, {
                    publicKey: site.pubKey,
                    allowedIps: await getAllowedIps(site.siteId)
                });
            } else if (site.type == "newt") {
                // get the newt on the site by querying the newt table for siteId
                const [newt] = await db
                    .select()
                    .from(newts)
                    .where(eq(newts.siteId, site.siteId))
                    .limit(1);

                removeTargets(newt.newtId, [deletedTarget], resource.protocol);
            }
        }

        return response(res, {
            data: null,
            success: true,
            error: false,
            message: "Target deleted successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
