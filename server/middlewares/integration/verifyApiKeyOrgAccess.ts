// This file is licensed under the Fossorial Commercial License.
// Unauthorized use, copying, modification, or distribution is strictly prohibited.
//
// Copyright (c) 2025 Fossorial LLC. All rights reserved.

import { Request, Response, NextFunction } from "express";
import { db } from "@server/db";
import { apiKeyOrg } from "@server/db/schemas";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";
import logger from "@server/logger";

export async function verifyApiKeyOrgAccess(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const apiKeyId = req.apiKey?.apiKeyId;
        const orgId = req.params.orgId;

        if (!apiKeyId) {
            return next(
                createHttpError(HttpCode.UNAUTHORIZED, "Key not authenticated")
            );
        }

        if (!orgId) {
            return next(
                createHttpError(HttpCode.BAD_REQUEST, "Invalid organization ID")
            );
        }

        if (!req.apiKeyOrg) {
            const apiKeyOrgRes = await db
                .select()
                .from(apiKeyOrg)
                .where(
                    and(
                        eq(apiKeyOrg.apiKeyId, apiKeyId),
                        eq(apiKeyOrg.orgId, orgId)
                    )
                );
            req.apiKeyOrg = apiKeyOrgRes[0];
        }

        if (!req.apiKeyOrg) {
            next(
                createHttpError(
                    HttpCode.FORBIDDEN,
                    "Key does not have access to this organization"
                )
            );
        }

        return next();
    } catch (e) {
        return next(
            createHttpError(
                HttpCode.INTERNAL_SERVER_ERROR,
                "Error verifying organization access"
            )
        );
    }
}
