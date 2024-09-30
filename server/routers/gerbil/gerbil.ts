import { Router } from "express";
import { getConfig } from "./getConfig";
import { receiveBandwidth } from "./receiveBandwidth";

const gerbil = Router();

gerbil.get("/", (_, res) => {
    res.status(200).json({ message: "Healthy" });
});

gerbil.get("/get-config", getConfig);
gerbil.post("/receive-bandwidth", receiveBandwidth);

export default gerbil;
