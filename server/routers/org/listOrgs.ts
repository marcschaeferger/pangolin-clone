import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { orgs } from '@server/db/schema';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';
import { sql } from 'drizzle-orm';

const listOrgsSchema = z.object({
  limit: z.string().optional().transform(Number).pipe(z.number().int().positive().default(10)),
  offset: z.string().optional().transform(Number).pipe(z.number().int().nonnegative().default(0)),
});

export async function listOrgs(req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const parsedQuery = listOrgsSchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return next(
        createHttpError(
          HttpCode.BAD_REQUEST,
          parsedQuery.error.errors.map(e => e.message).join(', ')
        )
      );
    }

    const { limit, offset } = parsedQuery.data;

    const organizations = await db.select()
      .from(orgs)
      .limit(limit)
      .offset(offset);

    const totalCountResult = await db.select({ count: sql<number>`cast(count(*) as integer)` })
      .from(orgs);
    const totalCount = totalCountResult[0].count;

    return res.status(HttpCode.OK).send(
      response(res, {
        data: {
          organizations,
          pagination: {
            total: totalCount,
            limit,
            offset,
          },
        },
        success: true,
        error: false,
        message: "Organizations retrieved successfully",
        status: HttpCode.OK,
      })
    );
  } catch (error) {
    next(error);
  }
}