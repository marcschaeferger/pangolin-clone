import { Router } from "express";
import * as site from "./site";
import * as org from "./org";
import * as resource from "./resource";
import * as target from "./target";
import * as user from "./user";
import * as auth from "./auth";
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
} from "./auth";

// Root routes
export const unauthenticated = Router();

unauthenticated.get("/", (_, res) => {
    res.status(HttpCode.OK).json({ message: "Healthy" });
});

// Authenticated Root routes
export const authenticated = Router();
authenticated.use(verifySessionUserMiddleware);
unauthenticated.use(
    rateLimitMiddleware({
        windowMin: 60,
        max: 5,
        type: "IP_AND_PATH",
        skipCondition: (req) => {
            return !["/auth/request-email-code"].includes(req.path);
        },
    }),
);

authenticated.put("/org", getUserOrgs, org.createOrg);
authenticated.get("/orgs", getUserOrgs, org.listOrgs); // TODO we need to check the orgs here
authenticated.get("/org/:orgId", verifyOrgAccess, org.getOrg);
authenticated.post("/org/:orgId", verifyOrgAccess, org.updateOrg);
authenticated.delete("/org/:orgId", verifyOrgAccess, org.deleteOrg);

authenticated.put("/org/:orgId/site", verifyOrgAccess, site.createSite);
authenticated.get("/org/:orgId/sites", verifyOrgAccess, site.listSites);
authenticated.get("/site/:siteId", verifySiteAccess, site.getSite);
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

authenticated.get("/users", user.listUsers);
// authenticated.get("/org/:orgId/users", user.???); // TODO: Implement this
authenticated.get("/user/:userId", user.getUser);
authenticated.delete("/user/:userId", user.deleteUser);

// Auth routes
unauthenticated.put("/auth/signup", auth.signup);
unauthenticated.post("/auth/login", auth.login);
unauthenticated.post("/auth/logout", auth.logout);
authenticated.post("/auth/verify-totp", auth.verifyTotp);
authenticated.post("/auth/request-totp-secret", auth.requestTotpSecret);
authenticated.post("/auth/disable-2fa", auth.disable2fa);
unauthenticated.post(
    "/auth/verify-email",
    verifySessionMiddleware,
    auth.verifyEmail,
);
unauthenticated.post(
    "/auth/request-email-code",
    verifySessionMiddleware,
    auth.requestEmailVerificationCode,
);
