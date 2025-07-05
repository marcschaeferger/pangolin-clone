import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import createHttpError from "http-errors";
import HttpCode from "@server/types/HttpCode";
import response from "@server/lib/response";
import logger from "@server/logger";
import fs from "fs";
import path from "path";
import { APP_PATH } from "@server/lib/consts";
import { format } from "date-fns";

const getAuditLogsQuerySchema = z.object({
    page: z.string().transform(Number).default("1"),
    action: z.string().optional(),
    search: z.string().optional()
}).strict();

export type AuditLogEntry = {
    timestamp: string;
    action: string;
    userId?: string;
    orgId?: string;
    targetEmail?: string;
    inviteId?: string;
    roleId?: number;
    ip?: string;
    success: boolean;
    error?: string;
};

const LOGS_PER_PAGE = 50;

export async function getAuditLogs(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedQuery = getAuditLogsQuerySchema.safeParse(req.query);
        if (!parsedQuery.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedQuery.error).toString()
                )
            );
        }

        const { page, action, search } = parsedQuery.data;
        const logFilePath = path.join(APP_PATH, "logs", "audit.log");

        if (!fs.existsSync(logFilePath)) {
            return response(res, {
                data: {
                    logs: [],
                    totalPages: 0
                },
                success: true,
                error: false,
                message: "No audit logs found",
                status: HttpCode.OK
            });
        }

        const fileContent = fs.readFileSync(logFilePath, 'utf-8');
        let logs: AuditLogEntry[] = [];
        
        // Split by newlines and process each line
        const lines = fileContent.split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
                // Extract the JSON part from the log line
                const jsonMatch = line.match(/\{.*\}/);
                if (jsonMatch) {
                    const logEntry = JSON.parse(jsonMatch[0]);
                    // Ensure the entry has the required fields
                    if (logEntry.timestamp && logEntry.action !== undefined && logEntry.success !== undefined) {
                        logs.push(logEntry);
                    }
                }
            } catch (err) {
                logger.warn(`Skipping invalid log entry: ${line}`);
                continue;
            }
        }

        // Apply filters
        if (action) {
            logs = logs.filter(log => log.action === action);
        }

        if (search) {
            const searchLower = search.toLowerCase();
            logs = logs.filter(log => 
                log.userId?.toLowerCase().includes(searchLower) ||
                log.orgId?.toLowerCase().includes(searchLower) ||
                log.targetEmail?.toLowerCase().includes(searchLower) ||
                log.inviteId?.toLowerCase().includes(searchLower) ||
                log.action.toLowerCase().includes(searchLower)
            );
        }

        // Sort by timestamp descending
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const totalPages = Math.ceil(logs.length / LOGS_PER_PAGE);
        const startIndex = (page - 1) * LOGS_PER_PAGE;
        const paginatedLogs = logs.slice(startIndex, startIndex + LOGS_PER_PAGE);

        return response(res, {
            data: {
                logs: paginatedLogs,
                totalPages
            },
            success: true,
            error: false,
            message: "Audit logs retrieved successfully",
            status: HttpCode.OK
        });
    } catch (error) {
        logger.error("Error retrieving audit logs:", error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "Error retrieving audit logs")
        );
    }
}

export async function downloadAuditLogs(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const logFilePath = path.join(APP_PATH, "logs", "audit.log");

        if (!fs.existsSync(logFilePath)) {
            return next(
                createHttpError(HttpCode.NOT_FOUND, "No audit logs found")
            );
        }

        const fileContent = fs.readFileSync(logFilePath, 'utf-8');
        let logs: AuditLogEntry[] = [];
        
        // Split by newlines and process each line
        const lines = fileContent.split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
                // Extract the JSON part from the log line
                const jsonMatch = line.match(/\{.*\}/);
                if (jsonMatch) {
                    const logEntry = JSON.parse(jsonMatch[0]);
                    // Ensure the entry has the required fields
                    if (logEntry.timestamp && logEntry.action !== undefined && logEntry.success !== undefined) {
                        logs.push(logEntry);
                    }
                }
            } catch (err) {
                logger.warn(`Skipping invalid log entry: ${line}`);
                continue;
            }
        }

        // Sort by timestamp descending
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const filename = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        
        return res.send(JSON.stringify(logs, null, 2));
    } catch (error) {
        logger.error("Error downloading audit logs:", error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "Error downloading audit logs")
        );
    }
} 