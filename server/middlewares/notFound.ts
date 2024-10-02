import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";

export function notFoundMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const message = `The requests url is not found - ${req.originalUrl}`;
    return next(createHttpError(HttpCode.NOT_FOUND, message));
}

export default notFoundMiddleware;
