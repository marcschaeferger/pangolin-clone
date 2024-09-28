import { Router } from "express";

const newt = Router();

newt.get("/", (_, res) => {
    res.status(200).json({ message: "Healthy" });
});

export default newt;
