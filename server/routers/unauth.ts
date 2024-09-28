import { Router } from "express";

const unauth = Router();

unauth.get("/", (_, res) => {
    res.status(200).json({ message: "Healthy" });
});

export default unauth;
