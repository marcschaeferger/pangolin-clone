import { Request, Response, NextFunction } from 'express';
import { db } from '@server/db';
import { roles, userOrgs } from '@server/db/schema';
import { and, eq } from 'drizzle-orm';
import createHttpError from 'http-errors';
import HttpCode from '@server/types/HttpCode';
import logger from '@server/logger';

export async function verifyUserInRole(req: Request, res: Response, next: NextFunction) {
    try {
        const roleId = parseInt(req.params.roleId || req.body.roleId || req.query.roleId);
        const userRoleId = req.userOrgRoleId;

        if (isNaN(roleId)) {
            return next(createHttpError(HttpCode.BAD_REQUEST, 'Invalid role ID'));
        }

        if (!userRoleId) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have access to this organization'));
        }

        if (userRoleId !== roleId) {
            return next(createHttpError(HttpCode.FORBIDDEN, 'User does not have access to this role'));
        }

        return next();
    } catch (error) {
        logger.error('Error verifying role access:', error);
        return next(createHttpError(HttpCode.INTERNAL_SERVER_ERROR, 'Error verifying role access'));
    }
}