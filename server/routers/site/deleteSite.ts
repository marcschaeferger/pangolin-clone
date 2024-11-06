import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import { sites } from "@server/db/schema";
import { eq } from "drizzle-orm";
import response from "@server/utils/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { deletePeer } from "../gerbil/peers";
import { fromError } from "zod-validation-error";

const API_BASE_URL = "http://localhost:3000";

const deleteSiteSchema = z.object({
    siteId: z.string().transform(Number).pipe(z.number().int().positive()),
});

export async function deleteSite(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = deleteSiteSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { siteId } = parsedParams.data;

        const [deletedSite] = await db
            .delete(sites)
            .where(eq(sites.siteId, siteId))
            .returning();

        if (!deletedSite) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Site with ID ${siteId} not found`
                )
            );
        }

        await deletePeer(deletedSite.exitNodeId!, deletedSite.pubKey);

        return response(res, {
            data: null,
            success: true,
            error: false,
            message: "Site deleted successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}

async function removePeer(publicKey: string) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/peer?public_key=${encodeURIComponent(publicKey)}`,
            {
                method: "DELETE",
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Peer removed successfully:", data.status);
        return data;
    } catch (error: any) {
        console.error("Error removing peer:", error.message);
        throw error;
    }
}
