/**
 * Logger Utility
 *
 * Centralized logging with automatic dev/prod handling.
 * In production, only errors and warnings are logged.
 * In development, all log levels are available.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const isDev = import.meta.env.DEV;

/**
 * Format log message with consistent prefix
 */
function formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    const prefix = `[${timestamp}]`;

    switch (level) {
        case "debug":
            return `${prefix} ${message}`;
        case "info":
            return `${prefix} ${message}`;
        case "warn":
            return `${prefix} ⚠️ ${message}`;
        case "error":
            return `${prefix} ❌ ${message}`;
    }
}

/**
 * Logger instance
 */
export const logger = {
    /**
     * Debug logs - only in development
     * Use for detailed debugging information
     */
    debug: (message: string, ...args: unknown[]) => {
        if (isDev) {
            console.log(formatMessage("debug", message), ...args);
        }
    },

    /**
     * Info logs - only in development
     * Use for general information
     */
    info: (message: string, ...args: unknown[]) => {
        if (isDev) {
            console.info(formatMessage("info", message), ...args);
        }
    },

    /**
     * Warning logs - always logged
     * Use for recoverable issues
     */
    warn: (message: string, ...args: unknown[]) => {
        console.warn(formatMessage("warn", message), ...args);
    },

    /**
     * Error logs - always logged
     * Use for errors and exceptions
     */
    error: (message: string, ...args: unknown[]) => {
        console.error(formatMessage("error", message), ...args);
    },
};
