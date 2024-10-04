import { Request } from "express";
import { User } from "@server/db/schema";
import { Session } from "lucia";

export interface AuthenticatedRequest extends Request {
    user: User;
    session: Session;
    userOrgRole?: string;
}
