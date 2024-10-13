import { GetUserResponse } from "@server/routers/user";
import { createContext } from "react";

export const UserContext = createContext<GetUserResponse | null>(null);
