import { Request } from "express";
import { User } from "@server/db/schemas";
import { Session } from "@server/db/schemas";

export interface AuthenticatedRequest extends Request {
    user: User;
    session: Session;
    userOrgRoleId?: number;
}
