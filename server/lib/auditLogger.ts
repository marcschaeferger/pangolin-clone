import * as winston from "winston";
import path from "path";
import { APP_PATH } from "../lib/consts";
import config from "./config";

const auditFormat = winston.format.printf(
    ({ level, message, timestamp, ...metadata }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
    }
);

const auditLogger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        auditFormat
    ),
    defaultMeta: { service: "audit" },
    transports: [
        new winston.transports.DailyRotateFile({
            filename: path.join(APP_PATH, "logs", "audit-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: "30d", // Keep audit logs for 30 days
            createSymlink: true,
            symlinkName: "audit.log"
        })
    ]
});

export type AuditAction = 
    | "invite.create"
    | "invite.regenerate"
    | "invite.delete"
    | "invite.accept"
    | "invite.expire";

export type AuditLogData = {
    userId?: string;
    orgId?: string;
    targetEmail?: string;
    inviteId?: string;
    roleId?: number;
    ip?: string;
    success: boolean;
    error?: string;
};

export function logAuditEvent(action: AuditAction, data: AuditLogData) {
    auditLogger.info(action, {
        ...data,
        timestamp: new Date().toISOString()
    });
}

export default auditLogger; 