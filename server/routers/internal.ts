import { Router } from "express";
import * as gerbil from "@server/routers/gerbil";
import * as badger from "@server/routers/badger";
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
internalRouter.use("/gerbil", gerbilRouter);

gerbilRouter.post("/get-config", gerbil.getConfig);
gerbilRouter.post("/receive-bandwidth", gerbil.receiveBandwidth);

// Badger routes
const badgerRouter = Router();
internalRouter.use("/badger", badgerRouter);

badgerRouter.get("/verify-user", badger.verifyUser)

export default internalRouter;
