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
import { createUser } from "./user/createUser";
import { updateUser } from "./user/updateUser";
import { deleteUser } from "./user/deleteUser";

const global = Router();

global.get("/", (_, res) => {
    res.status(200).json({ message: "Healthy" });
});

global.get("/site", getSite);
global.put("/site", createSite);
global.post("/site", updateSite);
global.delete("/site", deleteSite);
global.get("/org", getOrg);
global.put("/org", createOrg);
global.post("/org", updateOrg);
global.delete("/org", deleteOrg);
global.get("/resource", getResource);
global.put("/resource", createResource);
global.post("/resource", updateResource);
global.delete("/resource", deleteResource);
global.get("/target", getTarget);
global.put("/target", createTarget);
global.post("/target", updateTarget);
global.delete("/target", deleteTarget);
global.get("/user", getUser);
global.put("/user", createUser);
global.post("/user", updateUser);
global.delete("/user", deleteUser);

// auth
global.post("/signup", signup);
global.post("/login", login);

export default global;
