import { Router } from "express";
import badger from "./badger/badger";
import gerbil from "./gerbil/gerbil";
import newt from "./newt/newt";
import pangolin from "./pangolin/pangolin";

const unauth = Router();

unauth.get("/", (_, res) => {
    res.status(200).json({ message: "Healthy" });
});

unauth.use("/badger", badger);
unauth.use("/gerbil", badger);
unauth.use("/newt", badger);
unauth.use("/pangolin", badger);

export default unauth;
