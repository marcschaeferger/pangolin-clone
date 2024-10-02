import { Request, Response, NextFunction } from 'express';
import response from "@server/utils/response";
import HttpCode from '@server/types/HttpCode';

// define zod type here

export async function createSite(req: Request, res: Response, next: NextFunction): Promise<any> {
  return res.status(HttpCode.OK).send(
      response<null>({
          data: null,
          success: true,
          error: false,
          message: "Logged in successfully",
          status: HttpCode.OK,
      }),
  );
}
