import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { resources } from '@server/db/schema';
import { eq } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';

// Define Zod schema for request parameters validation
const deleteResourceSchema = z.object({
  resourceId: z.string().uuid()
});

export async function deleteResource(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate request parameters
    const parsedParams = deleteResourceSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return next(
        createHttpError(
          HttpCode.BAD_REQUEST,
          parsedParams.error.errors.map(e => e.message).join(', ')
        )
      );
    }

    const { resourceId } = parsedParams.data;

    // Delete the resource from the database
    const deletedResource = await db.delete(resources)
      .where(eq(resources.resourceId, resourceId))
      .returning();

    if (deletedResource.length === 0) {
      return next(
        createHttpError(
          HttpCode.NOT_FOUND,
          `Resource with ID ${resourceId} not found`
        )
      );
    }

    return res.status(HttpCode.OK).send(
      response({
        data: null,
        success: true,
        error: false,
        message: "Resource deleted successfully",
        status: HttpCode.OK,
      })
    );
  } catch (error) {
    next(error);
  }
}