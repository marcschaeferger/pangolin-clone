import { Router } from "express";
import { getConfig } from "./getConfig";
import { receiveBandwidth } from "./receiveBandwidth";

const badger = Router();

badger.get("/", (_, res) => {
    res.status(200).json({ message: "Healthy" });
});

badger.get("/getConfig", getConfig);
badger.post("/receiveBandwidth", receiveBandwidth);

export default badger;
