import { Router } from "express";
import gerbil from "./gerbil/gerbil";
import pangolin from "./pangolin/pangolin";

const unauth = Router();

unauth.get("/", (_, res) => {
    res.status(200).json({ message: "Healthy" });
});

unauth.use("/newt", gerbil);
unauth.use("/pangolin", pangolin);

export default unauth;
