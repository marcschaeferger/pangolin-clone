import { Router } from "express";

const gerbil = Router();

gerbil.get("/", (_, res) => {
    res.status(200).json({ message: "Healthy" });
});

export default gerbil;
