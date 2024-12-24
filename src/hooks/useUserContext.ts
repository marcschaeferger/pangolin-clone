import UserContext from "@app/contexts/userContext";
import { useContext } from "react";

export function userUserContext() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUserContext must be used within a UserProvider");
    }
    return context;
}
