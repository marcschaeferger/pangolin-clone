import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { resources } from '@server/db/schema';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';

// Define Zod schema for request body validation
const createResourceSchema = z.object({
  siteId: z.number().int().positive(),
  name: z.string().min(1).max(255),
  subdomain: z.string().min(1).max(255).optional(),
});

export async function createResource(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate request body
    const parsedBody = createResourceSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return next(
        createHttpError(
          HttpCode.BAD_REQUEST,
          parsedBody.error.errors.map(e => e.message).join(', ')
        )
      );
    }

    const { siteId, name, subdomain } = parsedBody.data;

    // Generate a unique resourceId
    const resourceId = "subdomain" // TODO: create the subdomain here

    // Create new resource in the database
    const newResource = await db.insert(resources).values({
      resourceId,
      siteId,
      name,
      subdomain,
    }).returning();

    return res.status(HttpCode.CREATED).send(
      response({
        data: newResource[0],
        success: true,
        error: false,
        message: "Resource created successfully",
        status: HttpCode.CREATED,
      })
    );
  } catch (error) {
    next(error);
  }
}