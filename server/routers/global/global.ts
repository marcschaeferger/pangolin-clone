import { Router } from "express";
import { createSite } from "./createSite";

const global = Router();

global.get("/", (_, res) => {
    res.status(200).json({ message: "Healthy" });
});

global.get("/createSite", createSite);

export default global;
