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

authenticated.put("/site", site.createSite);
authenticated.get("/site/:siteId", site.getSite);
authenticated.post("/site/:siteId", site.updateSite);
authenticated.delete("/site/:siteId", site.deleteSite);

authenticated.put("/org", org.createOrg);
authenticated.get("/org/:orgId", org.getOrg);
authenticated.post("/org/:orgId", org.updateOrg);
authenticated.delete("/org/:orgId", org.deleteOrg);

authenticated.put("/resource", resource.createResource);
authenticated.get("/resource/:resourceId", resource.getResource);
authenticated.post("/resource/:resourceId", resource.updateResource);
authenticated.delete("/resource/:resourceId", resource.deleteResource);

authenticated.put("/target", target.createTarget);
authenticated.get("/target/:targetId", target.getTarget);
authenticated.post("/target/:targetId", target.updateTarget);
authenticated.delete("/target/:targetId", target.deleteTarget);

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
