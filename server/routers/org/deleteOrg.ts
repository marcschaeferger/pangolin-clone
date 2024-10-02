import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { orgs } from '@server/db/schema';
import { eq } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';

const deleteOrgSchema = z.object({
  orgId: z.string().transform(Number).pipe(z.number().int().positive())
});

export async function deleteOrg(req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const parsedParams = deleteOrgSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return next(
        createHttpError(
          HttpCode.BAD_REQUEST,
          parsedParams.error.errors.map(e => e.message).join(', ')
        )
      );
    }

    const { orgId } = parsedParams.data;

    const deletedOrg = await db.delete(orgs)
      .where(eq(orgs.orgId, orgId))
      .returning();

    if (deletedOrg.length === 0) {
      return next(
        createHttpError(
          HttpCode.NOT_FOUND,
          `Organization with ID ${orgId} not found`
        )
      );
    }

    return res.status(HttpCode.OK).send(
      response({
        data: null,
        success: true,
        error: false,
        message: "Organization deleted successfully",
        status: HttpCode.OK,
      })
    );
  } catch (error) {
    next(error);
  }
}
