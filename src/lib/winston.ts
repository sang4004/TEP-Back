import winston, { createLogger, format, transports } from "winston";
import winstonDaily from "winston-daily-rotate-file";
import path from "path";
const { combine, timestamp, printf, colorize } = format;

const customFormat = printf(info => `${info.timestamp} ${info.level}: ${info.message}`);
const levels = { down: 0, error: 1, api: 2, warn: 3, info: 4 };

const logger = winston.createLogger({
    levels: levels,
    format: combine(
        timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
        }),
        customFormat
    ),
    transports: [
        new winston.transports.Console(),
        new winstonDaily({
            level: "info",
            datePattern: "YYYYMMDD",
            dirname: path.resolve(globalThis.HOME_PATH, "logs/info"),
            filename: `edms_%DATE%.log`,
            maxSize: null,
            maxFiles: 14,
        }),
        new winstonDaily({
            level: "warn",
            datePattern: "YYYYMMDD",
            dirname: path.resolve(globalThis.HOME_PATH, "logs/warn"),
            filename: `edms_%DATE%.warn.log`,
            maxSize: null,
            maxFiles: 30,
        }),
        new winstonDaily({
            level: "api",
            datePattern: "YYYYMMDD",
            dirname: path.resolve(globalThis.HOME_PATH, "logs/api"),
            filename: `edms_%DATE%.api.log`,
            maxSize: null,
            maxFiles: 30,
        }),
        new winstonDaily({
            level: "down",
            datePattern: "YYYYMMDD",
            dirname: path.resolve(globalThis.HOME_PATH, "logs/down"),
            filename: `edms_%DATE%.down.log`,
            maxSize: null,
            maxFiles: 30,
        }),
        new winstonDaily({
            level: "error",
            datePattern: "YYYYMMDD",
            dirname: path.resolve(globalThis.HOME_PATH, "logs/error"),
            filename: `edms_%DATE%.error.log`,
            maxSize: null,
            maxFiles: 30,
        }),
    ],
});

const stream = {
    write: message => {
        logger.info(message);
    },
};

export { logger, stream };
