import { Router } from "express";
import * as site from "./site";
import * as org from "./org";
import * as resource from "./resource";
import * as target from "./target";
import * as user from "./user";
import * as auth from "./auth";
import HttpCode from "@server/types/HttpCode";

// Root routes
export const unauthenticated = Router();

unauthenticated.get("/", (_, res) => {
    res.status(HttpCode.OK).json({ message: "Healthy" });
});

// Authenticated Root routes
export const authenticated = Router();

authenticated.put("/org", org.createOrg);
authenticated.get("/orgs", org.listOrgs);
authenticated.get("/org/:orgId", org.getOrg);
authenticated.post("/org/:orgId", org.updateOrg);
authenticated.delete("/org/:orgId", org.deleteOrg);

authenticated.put("/org/:orgId/site", site.createSite);
authenticated.get("/org/:orgId/sites", site.listSites);
authenticated.get("/site/:siteId", site.getSite);
authenticated.post("/site/:siteId", site.updateSite);
authenticated.delete("/site/:siteId", site.deleteSite);

authenticated.put("/org/:orgId/site/:siteId/resource", resource.createResource);
authenticated.get("/site/:siteId/resources", resource.listResources);
authenticated.get("/org/:orgId/resources", resource.listResources);
authenticated.get("/resource/:resourceId", resource.getResource);
authenticated.post("/resource/:resourceId", resource.updateResource);
authenticated.delete("/resource/:resourceId", resource.deleteResource);

authenticated.put("/resource/:resourceId/target", target.createTarget);
authenticated.get("/resource/:resourceId/targets", target.listTargets);
authenticated.get("/target/:targetId", target.getTarget);
authenticated.post("/target/:targetId", target.updateTarget);
authenticated.delete("/target/:targetId", target.deleteTarget);

authenticated.get("/users", user.listUsers);
// authenticated.get("/org/:orgId/users", user.???); // TODO: Implement this
authenticated.get("/user/:userId", user.getUser);
authenticated.delete("/user/:userId", user.deleteUser);

// Auth routes
const authRouter = Router();
unauthenticated.use("/auth", authRouter);

authRouter.put("/signup", auth.signup);
authRouter.post("/login", auth.login);
authRouter.post("/logout", auth.logout);
authRouter.post("/verify-totp", auth.verifyTotp);
authRouter.post("/request-totp-secret", auth.requestTotpSecret);
