import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import { OpenAPITags, registry } from "@server/openApi";
import { db } from "@server/db";
import { and, eq } from "drizzle-orm";
import { idp, idpOidcConfig, roles, userOrgs, users } from "@server/db";
import { generateId } from "@server/auth/sessions/app";

const paramsSchema = z
    .object({
        orgId: z.string().nonempty()
    })
    .strict();

const bodySchema = z
    .object({
        email: z
            .string()
            .optional()
            .refine((data) => {
                if (data) {
                    return z.string().email().safeParse(data).success;
                }
                return true;
            }),
        username: z.string().nonempty(),
        name: z.string().optional(),
        type: z.enum(["internal", "oidc"]).optional(),
        idpId: z.number().optional(),
        roleId: z.number()
    })
    .strict();

export type CreateOrgUserResponse = {};

registry.registerPath({
    method: "put",
    path: "/org/{orgId}/user",
    description: "Create an organization user.",
    tags: [OpenAPITags.User, OpenAPITags.Org],
    request: {
        params: paramsSchema,
        body: {
            content: {
                "application/json": {
                    schema: bodySchema
                }
            }
        }
    },
    responses: {}
});

export async function createOrgUser(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedBody = bodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedBody.error).toString()
                )
            );
        }

        const parsedParams = paramsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { orgId } = parsedParams.data;
        const { username, email, name, type, idpId, roleId } = parsedBody.data;

        const [role] = await db
            .select()
            .from(roles)
            .where(eq(roles.roleId, roleId));

        if (!role) {
            return next(
                createHttpError(HttpCode.BAD_REQUEST, "Role ID not found")
            );
        }

        if (type === "internal") {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    "Internal users are not supported yet"
                )
            );
        } else if (type === "oidc") {
            if (!idpId) {
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "IDP ID is required for OIDC users"
                    )
                );
            }

            const [idpRes] = await db
                .select()
                .from(idp)
                .innerJoin(idpOidcConfig, eq(idp.idpId, idpOidcConfig.idpId))
                .where(eq(idp.idpId, idpId));

            if (!idpRes) {
                return next(
                    createHttpError(HttpCode.BAD_REQUEST, "IDP ID not found")
                );
            }

            if (idpRes.idp.type !== "oidc") {
                return next(
                    createHttpError(
                        HttpCode.BAD_REQUEST,
                        "IDP ID is not of type OIDC"
                    )
                );
            }

            const [existingUser] = await db
                .select()
                .from(users)
                .where(eq(users.username, username));

            if (existingUser) {
                const [existingOrgUser] = await db
                    .select()
                    .from(userOrgs)
                    .where(
                        and(
                            eq(userOrgs.orgId, orgId),
                            eq(userOrgs.userId, existingUser.userId)
                        )
                    );

                if (existingOrgUser) {
                    return next(
                        createHttpError(
                            HttpCode.BAD_REQUEST,
                            "User already exists in this organization"
                        )
                    );
                }

                await db
                    .insert(userOrgs)
                    .values({
                        orgId,
                        userId: existingUser.userId,
                        roleId: role.roleId
                    })
                    .returning();
            } else {
                const userId = generateId(15);

                const [newUser] = await db
                    .insert(users)
                    .values({
                        userId: userId,
                        email,
                        username,
                        name,
                        type: "oidc",
                        idpId,
                        dateCreated: new Date().toISOString(),
                        emailVerified: true
                    })
                    .returning();

                await db
                    .insert(userOrgs)
                    .values({
                        orgId,
                        userId: newUser.userId,
                        roleId: role.roleId
                    })
                    .returning();
            }
        } else {
            return next(
                createHttpError(HttpCode.BAD_REQUEST, "User type is required")
            );
        }

        return response<CreateOrgUserResponse>(res, {
            data: {},
            success: true,
            error: false,
            message: "Org user created successfully",
            status: HttpCode.CREATED
        });
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}
