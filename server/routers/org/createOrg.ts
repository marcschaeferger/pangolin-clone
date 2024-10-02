import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { orgs } from '@server/db/schema';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';

const createOrgSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().min(1).max(255),
});

export async function createOrg(req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const parsedBody = createOrgSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return next(
        createHttpError(
          HttpCode.BAD_REQUEST,
          parsedBody.error.errors.map(e => e.message).join(', ')
        )
      );
    }

    const { name, domain } = parsedBody.data;

    const newOrg = await db.insert(orgs).values({
      name,
      domain,
    }).returning();

    return res.status(HttpCode.CREATED).send(
      response({
        data: newOrg[0],
        success: true,
        error: false,
        message: "Organization created successfully",
        status: HttpCode.CREATED,
      })
    );
  } catch (error) {
    next(error);
  }
}
