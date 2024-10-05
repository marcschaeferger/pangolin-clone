import { rateLimit } from "express-rate-limit";
import createHttpError from "http-errors";
import { NextFunction, Request, Response } from "express";
import logger from "@server/logger";
import HttpCode from "@server/types/HttpCode";

export function rateLimitMiddleware({
    windowMin,
    max,
    type,
    skipCondition,
}: {
    windowMin: number;
    max: number;
    type: "IP_ONLY" | "IP_AND_PATH";
    skipCondition?: (req: Request, res: Response) => boolean;
}) {
    if (type === "IP_AND_PATH") {
        return rateLimit({
            windowMs: windowMin * 60 * 1000,
            max,
            skip: skipCondition,
            keyGenerator: (req: Request) => {
                return `${req.ip}-${req.path}`;
            },
            handler: (req: Request, res: Response, next: NextFunction) => {
                const message = `Rate limit exceeded. You can make ${max} requests every ${windowMin} minute(s).`;
                logger.warn(
                    `Rate limit exceeded for IP ${req.ip} on path ${req.path}`,
                );
                return next(
                    createHttpError(HttpCode.TOO_MANY_REQUESTS, message),
                );
            },
        });
    }
    return rateLimit({
        windowMs: windowMin * 60 * 1000,
        max,
        skip: skipCondition,
        handler: (req: Request, res: Response, next: NextFunction) => {
            const message = `Rate limit exceeded. You can make ${max} requests every ${windowMin} minute(s).`;
            logger.warn(`Rate limit exceeded for IP ${req.ip}`);
            return next(createHttpError(HttpCode.TOO_MANY_REQUESTS, message));
        },
    });
}

export default rateLimitMiddleware;
