import { Router } from "express";
import { getConfig } from "./getConfig";

const badger = Router();

badger.get("/", (_, res) => {
    res.status(200).json({ message: "Healthy" });
});

badger.get("/getConfig", getConfig);

export default badger;
