import { Router } from "express";
import badger from "./badger/badger";
import gerbil from "./gerbil/gerbil";

const unauth = Router();

unauth.get("/", (_, res) => {
    res.status(200).json({ message: "Healthy" });
});

unauth.use("/badger", badger);
unauth.use("/gerbil", gerbil);

export default unauth;
