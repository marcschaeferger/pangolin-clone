import { createContext } from "react";

export const UserContext = createContext<{ id: string } | null>(null);
