import { Request } from "express";
import { User } from "@server/db/schema";
import { Session } from "@server/db/schema";

export interface AuthenticatedRequest extends Request {
    user: User;
    session: Session;
    userOrgRoleId?: number;
}
