import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { users } from '@server/db/schema';
import { eq } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';

const getUserSchema = z.object({
  userId: z.string().uuid()
});

export async function getUser(req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const parsedParams = getUserSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return next(
        createHttpError(
          HttpCode.BAD_REQUEST,
          parsedParams.error.errors.map(e => e.message).join(', ')
        )
      );
    }

    const { userId } = parsedParams.data;

    const user = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return next(
        createHttpError(
          HttpCode.NOT_FOUND,
          `User with ID ${userId} not found`
        )
      );
    }

    // Remove passwordHash from the response
    const { passwordHash: _, ...userWithoutPassword } = user[0];

    return res.status(HttpCode.OK).send(
      response({
        data: userWithoutPassword,
        success: true,
        error: false,
        message: "User retrieved successfully",
        status: HttpCode.OK,
      })
    );
  } catch (error) {
    next(error);
  }
}
