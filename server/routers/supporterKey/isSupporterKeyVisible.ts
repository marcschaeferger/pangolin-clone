import { Request, Response, NextFunction } from "express";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { response as sendResponse } from "@server/lib";
import config from "@server/lib/config";
import db from "@server/db";
import { count } from "drizzle-orm";
import { users } from "@server/db/schema";

export type IsSupporterKeyVisibleResponse = {
    visible: boolean;
};

const USER_LIMIT = 5;

export async function isSupporterKeyVisible(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const hidden = config.isSupporterKeyHidden();
        const key = config.getSupporterData();

        let visible = !hidden && key?.valid !== true;

        if (key?.tier === "Limited Supporter") {
            const [numUsers] = await db.select({ count: count() }).from(users);

            if (numUsers.count > USER_LIMIT) {
                visible = true;
            }
        }

        logger.debug(`Supporter key visible: ${visible}`);
        logger.debug(JSON.stringify(key));

        return sendResponse<IsSupporterKeyVisibleResponse>(res, {
            data: {
                visible
            },
            success: true,
            error: false,
            message: "Status",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
