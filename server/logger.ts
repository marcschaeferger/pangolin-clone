import "winston-daily-rotate-file";
import config, { APP_PATH } from "@server/config";
import * as winston from "winston";
import path from "path";

const hformat = winston.format.printf(
    ({ level, label, message, timestamp, stack, ...metadata }) => {
        let msg = `${timestamp} [${level}]${label ? `[${label}]` : ""}: ${message}`;
        if (stack) {
            msg += `\nStack: ${stack}`;
        }
        if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
    }
);

const transports: any = [new winston.transports.Console({})];

if (config.app.save_logs) {
    transports.push(
        new winston.transports.DailyRotateFile({
            filename: path.join(APP_PATH, "logs", "pangolin-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: "7d",
            createSymlink: true,
            symlinkName: "pangolin.log"
        })
    );
}

const logger = winston.createLogger({
    level: config.app.log_level.toLowerCase(),
    format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.colorize(),
        winston.format.splat(),
        winston.format.timestamp(),
        hformat
    ),
    transports
});

process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception:", { error, stack: error.stack });
    process.exit(1);
});

process.on("unhandledRejection", (reason, _) => {
    logger.error("Unhandled Rejection:", { reason });
});

export default logger;
