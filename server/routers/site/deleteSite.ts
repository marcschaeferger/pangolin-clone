import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { sites } from '@server/db/schema';
import { eq } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { ActionsEnum, checkUserActionPermission } from '@server/auth/actions';
import logger from '@server/logger';

const API_BASE_URL = "http://localhost:3000";

// Define Zod schema for request parameters validation
const deleteSiteSchema = z.object({
    siteId: z.string().transform(Number).pipe(z.number().int().positive())
});

export async function deleteSite(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        // Validate request parameters
        const parsedParams = deleteSiteSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    parsedParams.error.errors.map(e => e.message).join(', ')
                )
            );
        }

        const { siteId } = parsedParams.data;

        // Check if the user has permission to list sites
        const hasPermission = await checkUserActionPermission(ActionsEnum.deleteSite, req);
        if (!hasPermission) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have permission to perform this action'));
        }

        // Delete the site from the database
        const deletedSite = await db.delete(sites)
            .where(eq(sites.siteId, siteId))
            .returning();

        if (deletedSite.length === 0) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Site with ID ${siteId} not found`
                )
            );
        }

        return response(res, {
            data: null,
            success: true,
            error: false,
            message: "Site deleted successfully",
            status: HttpCode.OK,
        });
    } catch (error) {
        logger.error(error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred..."));
    }
}


async function removePeer(publicKey: string) {
    try {
        const response = await fetch(`${API_BASE_URL}/peer?public_key=${encodeURIComponent(publicKey)}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Peer removed successfully:', data.status);
        return data;
    } catch (error: any) {
        console.error('Error removing peer:', error.message);
        throw error;
    }
}
