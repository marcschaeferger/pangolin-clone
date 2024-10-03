import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { targets } from '@server/db/schema';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';

const createTargetSchema = z.object({
  resourceId: z.string().uuid(),
  ip: z.string().ip(),
  method: z.string().min(1).max(10),
  port: z.number().int().min(1).max(65535),
  protocol: z.string().optional(),
  enabled: z.boolean().default(true),
});

export async function createTarget(req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const parsedBody = createTargetSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return next(
        createHttpError(
          HttpCode.BAD_REQUEST,
          parsedBody.error.errors.map(e => e.message).join(', ')
        )
      );
    }

    const targetData = parsedBody.data;

    const newTarget = await db.insert(targets).values(targetData).returning();

    return res.status(HttpCode.CREATED).send(
      response(res, {
        data: newTarget[0],
        success: true,
        error: false,
        message: "Target created successfully",
        status: HttpCode.CREATED,
      })
    );
  } catch (error) {
    next(error);
  }
}
