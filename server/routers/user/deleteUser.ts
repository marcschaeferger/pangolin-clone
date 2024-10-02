import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '@server/db';
import { users } from '@server/db/schema';
import { eq } from 'drizzle-orm';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';
import createHttpError from 'http-errors';

const deleteUserSchema = z.object({
  userId: z.string().uuid()
});

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<any> {
  try {
    const parsedParams = deleteUserSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return next(
        createHttpError(
          HttpCode.BAD_REQUEST,
          parsedParams.error.errors.map(e => e.message).join(', ')
        )
      );
    }

    const { userId } = parsedParams.data;

    const deletedUser = await db.delete(users)
      .where(eq(users.id, userId))
      .returning();

    if (deletedUser.length === 0) {
      return next(
        createHttpError(
          HttpCode.NOT_FOUND,
          `User with ID ${userId} not found`
        )
      );
    }

    return res.status(HttpCode.OK).send(
      response({
        data: null,
        success: true,
        error: false,
        message: "User deleted successfully",
        status: HttpCode.OK,
      })
    );
  } catch (error) {
    next(error);
  }
}
