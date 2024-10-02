import { rateLimit } from "express-rate-limit";
import createHttpError from "http-errors";
import { NextFunction, Request, Response } from "express";
import logger from "@server/logger";
import HttpCode from "@server/types/HttpCode";

const limit = 100;
const minutes = 1;

export const rateLimitMiddleware = rateLimit({
    windowMs: minutes * 60 * 1000,
    limit,
    handler: (req: Request, res: Response, next: NextFunction) => {
        const message = `Rate limit exceeded. You can make ${limit} requests every ${minutes} minute(s).`;
        logger.warn(`Rate limit exceeded for IP ${req.ip}`);
        return next(createHttpError(HttpCode.TOO_MANY_REQUESTS, message));
    },
});

export default rateLimitMiddleware;
