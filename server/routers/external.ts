import { Router } from "express";
import badger from "./badger/badger";
import pangolin from "./pangolin/pangolin";

const unauth = Router();

unauth.get("/", (_, res) => {
    res.status(200).json({ message: "Healthy" });
});

unauth.use("/newt", badger);
unauth.use("/pangolin", pangolin);

export default unauth;
