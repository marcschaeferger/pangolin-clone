import { Router } from "express";
import { getConfig } from "./getConfig";
import { receiveBandwidth } from "./receiveBandwidth";

const gerbil = Router();

gerbil.get("/", (_, res) => {
    res.status(200).json({ message: "Healthy" });
});

gerbil.get("/getConfig", getConfig);
gerbil.post("/receiveBandwidth", receiveBandwidth);

export default gerbil;
