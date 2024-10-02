import { Router } from "express";
import { signup } from "@server/auth/signup";
import { login } from "@server/auth/login";
import { getSite } from "./site/getSite";
import { createSite } from "./site/createSite";
import { updateSite } from "./site/updateSite";
import { deleteSite } from "./site/deleteSite";
import { getOrg } from "./org/getOrg";
import { createOrg } from "./org/createOrg";
import { updateOrg } from "./org/updateOrg";
import { deleteOrg } from "./org/deleteOrg";
import { getResource } from "./resource/getResource";
import { createResource } from "./resource/createResource";
import { updateResource } from "./resource/updateResource";
import { deleteResource } from "./resource/deleteResource";
import { getTarget } from "./target/getTarget";
import { createTarget } from "./target/createTarget";
import { updateTarget } from "./target/updateTarget";
import { deleteTarget } from "./target/deleteTarget";
import { getUser } from "./user/getUser";
import { deleteUser } from "./user/deleteUser";

const global = Router();

global.get("/", (_, res) => {
    res.status(200).json({ message: "Healthy" });
});

global.put("/site", createSite);
global.get("/site/:siteId", getSite);
global.post("/site/:siteId", updateSite);
global.delete("/site/:siteId", deleteSite);

global.put("/org", createOrg);
global.get("/org/:orgId", getOrg);
global.post("/org/:orgId", updateOrg);
global.delete("/org/:orgId", deleteOrg);

global.put("/resource", createResource);
global.get("/resource/resourceId", getResource);
global.post("/resource/resourceId", updateResource);
global.delete("/resource/resourceId", deleteResource);

global.put("/target", createTarget);
global.get("/target/:targetId", getTarget);
global.post("/target/:targetId", updateTarget);
global.delete("/target/:targetId", deleteTarget);

global.get("/user/:userId", getUser);
global.delete("/user/:userId", deleteUser);

// auth
global.post("/signup", signup);
global.post("/login", login);

export default global;
