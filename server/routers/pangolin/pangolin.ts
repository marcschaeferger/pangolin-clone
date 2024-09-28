import { Router } from "express";

const pangolin = Router();

pangolin.get("/", (_, res) => {
    res.status(200).json({ message: "Healthy" });
});

export default pangolin;
