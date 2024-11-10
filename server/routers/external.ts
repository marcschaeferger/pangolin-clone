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
    verifyUserAccess,
} from "./auth";
import { verifyUserHasAction } from "./auth/verifyUserHasAction";
import { ActionsEnum } from "@server/auth/actions";
import { verifyUserIsOrgOwner } from "./auth/verifyUserIsOrgOwner";

// Root routes
export const unauthenticated = Router();

unauthenticated.get("/", (_, res) => {
    res.status(HttpCode.OK).json({ message: "Healthy" });
});

// Authenticated Root routes
export const authenticated = Router();
authenticated.use(verifySessionUserMiddleware);

authenticated.get("/org/checkId", org.checkId);
authenticated.put("/org", getUserOrgs, org.createOrg);
authenticated.get("/orgs", getUserOrgs, org.listOrgs); // TODO we need to check the orgs here
authenticated.get(
    "/org/:orgId",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.getOrg),
    org.getOrg
);
authenticated.post(
    "/org/:orgId",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.updateOrg),
    org.updateOrg
);
authenticated.delete(
    "/org/:orgId",
    verifyOrgAccess,
    verifyUserIsOrgOwner,
    org.deleteOrg
);

authenticated.put(
    "/org/:orgId/site",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.createSite),
    site.createSite
);
authenticated.get(
    "/org/:orgId/sites",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.listSites),
    site.listSites
);
authenticated.get(
    "/org/:orgId/site/:niceId",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.getSite),
    site.getSite
);

authenticated.get(
    "/org/:orgId/pick-site-defaults",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.createSite),
    site.pickSiteDefaults
);
authenticated.get(
    "/site/:siteId",
    verifySiteAccess,
    verifyUserHasAction(ActionsEnum.getSite),
    site.getSite
);
// authenticated.get(
//     "/site/:siteId/roles",
//     verifySiteAccess,
//     verifyUserHasAction(ActionsEnum.listSiteRoles),
//     site.listSiteRoles
// );
authenticated.post(
    "/site/:siteId",
    verifySiteAccess,
    verifyUserHasAction(ActionsEnum.updateSite),
    site.updateSite
);
authenticated.delete(
    "/site/:siteId",
    verifySiteAccess,
    verifyUserHasAction(ActionsEnum.deleteSite),
    site.deleteSite
);

authenticated.put(
    "/org/:orgId/site/:siteId/resource",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.createResource),
    resource.createResource
);
authenticated.get(
    "/site/:siteId/resources",
    verifyUserHasAction(ActionsEnum.listResources),
    resource.listResources
);
authenticated.get(
    "/org/:orgId/resources",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.listResources),
    resource.listResources
);

authenticated.post(
    "/org/:orgId/create-invite",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.inviteUser),
    user.inviteUser
); // maybe make this /invite/create instead
authenticated.post("/invite/accept", user.acceptInvite);

// authenticated.get(
//     "/resource/:resourceId/roles",
//     verifyResourceAccess,
//     verifyUserHasAction(ActionsEnum.listResourceRoles),
//     resource.listResourceRoles
// );
authenticated.get(
    "/resource/:resourceId",
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.getResource),
    resource.getResource
);
authenticated.post(
    "/resource/:resourceId",
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.updateResource),
    resource.updateResource
);
authenticated.delete(
    "/resource/:resourceId",
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.deleteResource),
    resource.deleteResource
);

authenticated.put(
    "/resource/:resourceId/target",
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.createTarget),
    target.createTarget
);
authenticated.get(
    "/resource/:resourceId/targets",
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.listTargets),
    target.listTargets
);
authenticated.get(
    "/target/:targetId",
    verifyTargetAccess,
    verifyUserHasAction(ActionsEnum.getTarget),
    target.getTarget
);
authenticated.post(
    "/target/:targetId",
    verifyTargetAccess,
    verifyUserHasAction(ActionsEnum.updateTarget),
    target.updateTarget
);
authenticated.delete(
    "/target/:targetId",
    verifyTargetAccess,
    verifyUserHasAction(ActionsEnum.deleteTarget),
    target.deleteTarget
);

authenticated.put(
    "/org/:orgId/role",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.createRole),
    role.createRole
);
authenticated.get(
    "/org/:orgId/roles",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.listRoles),
    role.listRoles
);
// authenticated.get(
//     "/role/:roleId",
//     verifyRoleAccess,
//     verifyUserInRole,
//     verifyUserHasAction(ActionsEnum.getRole),
//     role.getRole
// );
// authenticated.post(
//     "/role/:roleId",
//     verifyRoleAccess,
//     verifyUserHasAction(ActionsEnum.updateRole),
//     role.updateRole
// );
authenticated.delete(
    "/role/:roleId",
    verifyRoleAccess,
    verifyUserHasAction(ActionsEnum.deleteRole),
    role.deleteRole
);
authenticated.post(
    "/role/:roleId/add/:userId",
    verifyRoleAccess,
    verifyUserAccess,
    verifyUserHasAction(ActionsEnum.addUserRole),
    user.addUserRole
);

// authenticated.put(
//     "/role/:roleId/site",
//     verifyRoleAccess,
//     verifyUserInRole,
//     verifyUserHasAction(ActionsEnum.addRoleSite),
//     role.addRoleSite
// );
// authenticated.delete(
//     "/role/:roleId/site",
//     verifyRoleAccess,
//     verifyUserInRole,
//     verifyUserHasAction(ActionsEnum.removeRoleSite),
//     role.removeRoleSite
// );
// authenticated.get(
//     "/role/:roleId/sites",
//     verifyRoleAccess,
//     verifyUserInRole,
//     verifyUserHasAction(ActionsEnum.listRoleSites),
//     role.listRoleSites
// );
// authenticated.put(
//     "/role/:roleId/resource",
//     verifyRoleAccess,
//     verifyUserInRole,
//     verifyUserHasAction(ActionsEnum.addRoleResource),
//     role.addRoleResource
// );
// authenticated.delete(
//     "/role/:roleId/resource",
//     verifyRoleAccess,
//     verifyUserInRole,
//     verifyUserHasAction(ActionsEnum.removeRoleResource),
//     role.removeRoleResource
// );
// authenticated.get(
//     "/role/:roleId/resources",
//     verifyRoleAccess,
//     verifyUserInRole,
//     verifyUserHasAction(ActionsEnum.listRoleResources),
//     role.listRoleResources
// );
// authenticated.put(
//     "/role/:roleId/action",
//     verifyRoleAccess,
//     verifyUserInRole,
//     verifyUserHasAction(ActionsEnum.addRoleAction),
//     role.addRoleAction
// );
// authenticated.delete(
//     "/role/:roleId/action",
//     verifyRoleAccess,
//     verifyUserInRole,
//     verifyUserHasAction(ActionsEnum.removeRoleAction),
//     role.removeRoleAction
// );
// authenticated.get(
//     "/role/:roleId/actions",
//     verifyRoleAccess,
//     verifyUserInRole,
//     verifyUserHasAction(ActionsEnum.listRoleActions),
//     role.listRoleActions
// );

unauthenticated.get("/user", verifySessionMiddleware, user.getUser);

authenticated.get("/org/:orgId/user/:userId", verifyOrgAccess, user.getOrgUser);
authenticated.get(
    "/org/:orgId/users",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.listUsers),
    user.listUsers
);
authenticated.delete(
    "/org/:orgId/user/:userId",
    verifyOrgAccess,
    verifyUserAccess,
    verifyUserHasAction(ActionsEnum.removeUser),
    user.removeUserOrg
);

// authenticated.put(
//     "/user/:userId/site",
//     verifySiteAccess,
//     verifyUserAccess,
//     verifyUserHasAction(ActionsEnum.addRoleSite),
//     role.addRoleSite
// );
// authenticated.delete(
//     "/user/:userId/site",
//     verifySiteAccess,
//     verifyUserAccess,
//     verifyUserHasAction(ActionsEnum.removeRoleSite),
//     role.removeRoleSite
// );
// authenticated.put(
//     "/user/:userId/resource",
//     verifyResourceAccess,
//     verifyUserAccess,
//     verifyUserHasAction(ActionsEnum.addRoleResource),
//     role.addRoleResource
// );
// authenticated.delete(
//     "/user/:userId/resource",
//     verifyResourceAccess,
//     verifyUserAccess,
//     verifyUserHasAction(ActionsEnum.removeRoleResource),
//     role.removeRoleResource
// );
// authenticated.put(
//     "/org/:orgId/user/:userId/action",
//     verifyOrgAccess,
//     verifyUserAccess,
//     verifyUserHasAction(ActionsEnum.addRoleAction),
//     role.addRoleAction
// );
// authenticated.delete(
//     "/org/:orgId/user/:userId/action",
//     verifyOrgAccess,
//     verifyUserAccess,
//     verifyUserHasAction(ActionsEnum.removeRoleAction),
//     role.removeRoleAction
// );

// Auth routes
export const authRouter = Router();
unauthenticated.use("/auth", authRouter);
authRouter.use(
    rateLimitMiddleware({
        windowMin: 10,
        max: 15,
        type: "IP_AND_PATH",
    })
);

authRouter.put("/signup", auth.signup);
authRouter.post("/login", auth.login);
authRouter.post("/logout", auth.logout);
authRouter.post("/2fa/enable", verifySessionUserMiddleware, auth.verifyTotp);
authRouter.post(
    "/2fa/request",
    verifySessionUserMiddleware,
    auth.requestTotpSecret
);
authRouter.post("/2fa/disable", verifySessionUserMiddleware, auth.disable2fa);
authRouter.post("/verify-email", verifySessionMiddleware, auth.verifyEmail);
authRouter.post(
    "/verify-email/request",
    verifySessionMiddleware,
    auth.requestEmailVerificationCode
);
authRouter.post(
    "/change-password",
    verifySessionUserMiddleware,
    auth.changePassword
);
authRouter.post("/reset-password/request", auth.requestPasswordReset);
authRouter.post("/reset-password/", auth.resetPassword);
