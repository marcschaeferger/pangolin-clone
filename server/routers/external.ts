import { Router } from "express";
import * as site from "./site";
import * as org from "./org";
import * as resource from "./resource";
import * as target from "./target";
import * as user from "./user";
import * as auth from "./auth";
import * as role from "./role";
import HttpCode from "@server/types/HttpCode";
import {
    rateLimitMiddleware,
    verifySessionMiddleware,
    verifySessionUserMiddleware,
} from "@server/middlewares";
import {
    verifyOrgAccess,
    getUserOrgs,
    verifySiteAccess,
    verifyResourceAccess,
    verifyTargetAccess,
    verifyRoleAccess,
    verifySuperuser,
    verifyUserInRole,
    verifyUserAccess,
} from "./auth";

// Root routes
export const unauthenticated = Router();

unauthenticated.get("/", (_, res) => {
    res.status(HttpCode.OK).json({ message: "Healthy" });
});

// Authenticated Root routes
export const authenticated = Router();
authenticated.use(verifySessionUserMiddleware);

authenticated.put("/org", getUserOrgs, org.createOrg);
authenticated.get("/orgs", getUserOrgs, org.listOrgs); // TODO we need to check the orgs here
authenticated.get("/org/:orgId", verifyOrgAccess, org.getOrg);
authenticated.post("/org/:orgId", verifyOrgAccess, org.updateOrg);
authenticated.delete("/org/:orgId", verifyOrgAccess, org.deleteOrg);

authenticated.put("/org/:orgId/site", verifyOrgAccess, site.createSite);
authenticated.get("/org/:orgId/sites", verifyOrgAccess, site.listSites);
authenticated.get("/site/:siteId", verifySiteAccess, site.getSite);
authenticated.get("/site/:siteId/roles", verifySiteAccess, site.listSiteRoles);
authenticated.post("/site/:siteId", verifySiteAccess, site.updateSite);
authenticated.delete("/site/:siteId", verifySiteAccess, site.deleteSite);

authenticated.put(
    "/org/:orgId/site/:siteId/resource",
    verifyOrgAccess,
    resource.createResource,
);
authenticated.get("/site/:siteId/resources", resource.listResources);
authenticated.get(
    "/org/:orgId/resources",
    verifyOrgAccess,
    resource.listResources,
);
authenticated.get(
    "/resource/:resourceId/roles",
    verifyResourceAccess,
    resource.listResourceRoles,
);
authenticated.get(
    "/resource/:resourceId",
    verifyResourceAccess,
    resource.getResource,
);
authenticated.post(
    "/resource/:resourceId",
    verifyResourceAccess,
    resource.updateResource,
);
authenticated.delete(
    "/resource/:resourceId",
    verifyResourceAccess,
    resource.deleteResource,
);

authenticated.put(
    "/resource/:resourceId/target",
    verifyResourceAccess,
    target.createTarget,
);
authenticated.get(
    "/resource/:resourceId/targets",
    verifyResourceAccess,
    target.listTargets,
);
authenticated.get("/target/:targetId", verifyTargetAccess, target.getTarget);
authenticated.post(
    "/target/:targetId",
    verifyTargetAccess,
    target.updateTarget,
);
authenticated.delete(
    "/target/:targetId",
    verifyTargetAccess,
    target.deleteTarget,
);

authenticated.put(
    "/org/:orgId/role",
    verifyOrgAccess,
    verifySuperuser,
    role.createRole,
);
authenticated.get("/org/:orgId/roles", verifyOrgAccess, role.listRoles);
authenticated.get(
    "/role/:roleId",
    verifyRoleAccess,
    verifyUserInRole,
    role.getRole,
);
authenticated.post(
    "/role/:roleId",
    verifyRoleAccess,
    verifySuperuser,
    role.updateRole,
);
authenticated.delete(
    "/role/:roleId",
    verifyRoleAccess,
    verifySuperuser,
    role.deleteRole,
);

authenticated.put(
    "/role/:roleId/site",
    verifyRoleAccess,
    verifyUserInRole,
    role.addRoleSite,
);
authenticated.delete(
    "/role/:roleId/site",
    verifyRoleAccess,
    verifyUserInRole,
    role.removeRoleSite,
);
authenticated.get(
    "/role/:roleId/sites",
    verifyRoleAccess,
    verifyUserInRole,
    role.listRoleSites,
);
authenticated.put(
    "/role/:roleId/resource",
    verifyRoleAccess,
    verifyUserInRole,
    role.addRoleResource,
);
authenticated.delete(
    "/role/:roleId/resource",
    verifyRoleAccess,
    verifyUserInRole,
    role.removeRoleResource,
);
authenticated.get(
    "/role/:roleId/resources",
    verifyRoleAccess,
    verifyUserInRole,
    role.listRoleResources,
);
authenticated.put(
    "/role/:roleId/action",
    verifyRoleAccess,
    verifyUserInRole,
    role.addRoleAction,
);
authenticated.delete(
    "/role/:roleId/action",
    verifyRoleAccess,
    verifyUserInRole,
    verifySuperuser,
    role.removeRoleAction,
);
authenticated.get(
    "/role/:roleId/actions",
    verifyRoleAccess,
    verifyUserInRole,
    verifySuperuser,
    role.listRoleActions,
);

unauthenticated.get("/user", verifySessionMiddleware, user.getUser);

authenticated.get("/org/:orgId/users", verifyOrgAccess, user.listUsers);
authenticated.delete(
    "/org/:orgId/user/:userId",
    verifyOrgAccess,
    verifyUserAccess,
    user.removeUserOrg,
);
authenticated.put(
    "/org/:orgId/user/:userId",
    verifyOrgAccess,
    verifyUserAccess,
    user.addUserOrg,
);

authenticated.put(
    "/user/:userId/site",
    verifySiteAccess,
    verifyUserAccess,
    role.addRoleSite,
);
authenticated.delete(
    "/user/:userId/site",
    verifySiteAccess,
    verifyUserAccess,
    role.removeRoleSite,
);
authenticated.put(
    "/user/:userId/resource",
    verifyResourceAccess,
    verifyUserAccess,
    role.addRoleResource,
);
authenticated.delete(
    "/user/:userId/resource",
    verifyResourceAccess,
    verifyUserAccess,
    role.removeRoleResource,
);
authenticated.put(
    "/org/:orgId/user/:userId/action",
    verifyOrgAccess,
    verifyUserAccess,
    verifySuperuser,
    role.addRoleAction,
);
authenticated.delete(
    "/org/:orgId/user/:userId/action",
    verifyOrgAccess,
    verifyUserAccess,
    verifySuperuser,
    role.removeRoleAction,
);

// Auth routes
export const authRouter = Router();
unauthenticated.use("/auth", authRouter);
authRouter.use(
    rateLimitMiddleware({
        windowMin: 10,
        max: 15,
        type: "IP_AND_PATH",
    }),
);

authRouter.put("/signup", auth.signup);
authRouter.post("/login", auth.login);
authRouter.post("/logout", auth.logout);
authRouter.post("/2fa/enable", verifySessionUserMiddleware, auth.verifyTotp);
authRouter.post(
    "/2fa/request",
    verifySessionUserMiddleware,
    auth.requestTotpSecret,
);
authRouter.post("/2fa/disable", verifySessionUserMiddleware, auth.disable2fa);
authRouter.post("/verify-email", verifySessionMiddleware, auth.verifyEmail);
authRouter.post(
    "/verify-email/request",
    verifySessionMiddleware,
    auth.requestEmailVerificationCode,
);
authRouter.post(
    "/change-password",
    verifySessionUserMiddleware,
    auth.changePassword,
);
authRouter.post("/reset-password/request", auth.requestPasswordReset);
authRouter.post("/reset-password/", auth.resetPassword);
