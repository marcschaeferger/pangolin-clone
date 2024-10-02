import { Router } from "express";
import { createSite } from "./createSite";
import { signup } from "@server/auth/signup";
import { login } from "@server/auth/login";

const global = Router();

global.get("/", (_, res) => {
    res.status(200).json({ message: "Healthy" });
});

global.get("/createSite", createSite);

// auth
global.post("/signup", signup);
global.post("/login", login);

export default global;
