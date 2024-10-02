import { Router } from "express";
import * as gerbil from "@server/routers/gerbil";
import * as traefik from "@server/routers/traefik";
import HttpCode from "@server/types/HttpCode";

// Root routes
const internalRouter = Router();

internalRouter.get("/", (_, res) => {
    res.status(HttpCode.OK).json({ message: "Healthy" });
});

internalRouter.get("/traefik-config", traefik.traefikConfigProvider);

// Gerbil routes
const gerbilRouter = Router();

gerbilRouter.get("/get-config", gerbil.getConfig);
gerbilRouter.post("/receive-bandwidth", gerbil.receiveBandwidth);

internalRouter.use("/gerbil", gerbilRouter);

export default internalRouter;
