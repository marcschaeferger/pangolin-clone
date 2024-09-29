import { Router } from "express";

const badger = Router();

badger.get("/", (_, res) => {
    res.status(200).json({ message: "Healthy" });
});

export default badger;
