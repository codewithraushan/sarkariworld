import fs from "fs";
import winston from "winston";
import dotenv from "dotenv";
dotenv.config();

class Logger {
	constructor() {
		// Ensure logs directory exists
		let logFile = process.env.LOG_FILE_PATH || "./logs";
		if (!fs.existsSync(logFile)) {
			fs.mkdirSync(logFile, { recursive: true });
		}

		this.customLevels = {
			levels: {
				fatal: 0,
				error: 1,
				warn: 2,
				info: 3,
				http: 4,
				debug: 5,
				trace: 6,
			},
			colors: {
				fatal: "red",
				error: "red",
				warn: "yellow",
				info: "green",
				http: "magenta",
				debug: "blue",
				trace: "cyan",
			},
		};

		winston.addColors(this.customLevels.colors);

		this.consoleFormat = this.getPrettyFormat(true); // with colors
		this.fileFormat = this.getPrettyFormat(false); // remove colors for file

		this.winstonLogger = this.createLogger();
		this.setupHandlers();
	}

	// Create timestamp
	timezoned() {
		const now = new Date();
		const pad = (n) => String(n).padStart(2, "0");
		return (
			`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
			`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
		);
	}

	// Pretty formatter shared by both console & file
	getPrettyFormat(enableColors) {
		const self = this;

		return winston.format.combine(
			winston.format.timestamp({ format: () => self.timezoned() }),
			winston.format.errors({ stack: true }),
			winston.format.splat(),
			enableColors ? winston.format.colorize({ all: true }) : winston.format.uncolorize(),
			winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
				let output = `${timestamp} [${level}]: ${message}`;

				if (Object.keys(meta).length > 0) {
					const json = JSON.stringify(meta, null, 2).split("\n");
					output += `\n  ┌─────────────────────────────────────┐`;
					json.forEach((line) => {
						output += `\n  │ ${line}`;
					});
					output += `\n  └─────────────────────────────────────┘`;
				}

				if (stack) {
					output += `\n  ⚠ Stack: ${stack}`;
				}

				return output;
			})
		);
	}

	createLogger() {
		const logLevel = process.env.LOG_LEVEL || "info";
		const enableFileLog = process.env.LOG_TO_FILE === "true";

		const transports = [
			new winston.transports.Console({
				level: logLevel,
				format: this.consoleFormat,
			}),
		];

		if (enableFileLog) {
			transports.push(
				new winston.transports.File({
					filename: process.env.LOG_FILE_PATH || "./logs/app.log",
					level: logLevel,
					format: this.fileFormat,
					maxsize: 5 * 1024 * 1024,
					maxFiles: 5,
				})
			);
		}

		return winston.createLogger({
			levels: this.customLevels.levels,
			level: logLevel,
			transports,
		});
	}

	setupHandlers() {
		const self = this;

		process.on("uncaughtException", (error) => {
			self.winstonLogger.fatal("Uncaught Exception", {
				error: error.message,
				stack: error.stack,
				timestamp: self.timezoned(),
			});
			process.exit(1);
		});

		process.on("unhandledRejection", (reason, promise) => {
			self.winstonLogger.fatal("Unhandled Rejection", {
				reason,
				promise: String(promise),
				timestamp: self.timezoned(),
			});
		});
	}

	info(message, metadata = {}) {
		this.winstonLogger.info(message, metadata);
	}
	error(message, metadata = {}) {
		this.winstonLogger.error(message, metadata);
	}
	warn(message, metadata = {}) {
		this.winstonLogger.warn(message, metadata);
	}
	debug(message, metadata = {}) {
		this.winstonLogger.debug(message, metadata);
	}
	fatal(message, metadata = {}) {
		this.winstonLogger.fatal(message, metadata);
	}
	http(message, metadata = {}) {
		this.winstonLogger.http(message, metadata);
	}
	trace(message, metadata = {}) {
		this.winstonLogger.trace(message, metadata);
	}

	child(metadata = {}) {
		return this.winstonLogger.child(metadata);
	}
}

const logger = new Logger();
export default logger;
