import { UserContext } from "@app/contexts/userContext";
import { useContext } from "react";

export function useUserContext() {
    const user = useContext(UserContext);
    return user;
}
