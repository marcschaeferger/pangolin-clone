import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { resources } from '@server/db/schema';
import { eq } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';

// Define Zod schema for request parameters validation
const getResourceSchema = z.object({
  resourceId: z.string().uuid()
});

export async function getResource(req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    // Validate request parameters
    const parsedParams = getResourceSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return next(
        createHttpError(
          HttpCode.BAD_REQUEST,
          parsedParams.error.errors.map(e => e.message).join(', ')
        )
      );
    }

    const { resourceId } = parsedParams.data;

    // Fetch the resource from the database
    const resource = await db.select()
      .from(resources)
      .where(eq(resources.resourceId, resourceId))
      .limit(1);

    if (resource.length === 0) {
      return next(
        createHttpError(
          HttpCode.NOT_FOUND,
          `Resource with ID ${resourceId} not found`
        )
      );
    }

    return res.status(HttpCode.OK).send(
      response(res, {
        data: resource[0],
        success: true,
        error: false,
        message: "Resource retrieved successfully",
        status: HttpCode.OK,
      })
    );
  } catch (error) {
    next(error);
  }
}
