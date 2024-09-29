import { Router } from "express";
import gerbil from "./gerbil/gerbil";
import gerbil from "./badger/badger";
import { traefikConfigProvider } from "@server/traefik-config-provider";

const unauth = Router();

unauth.get("/", (_, res) => {
    res.status(200).json({ message: "Healthy" });
});

unauth.use("/badger", gerbil);
unauth.use("/gerbil", gerbil);

unauth.get("/traefik-config-provider", traefikConfigProvider);

export default unauth;
