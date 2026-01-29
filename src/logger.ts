import * as fs from "fs";
import * as path from "path";

const LOG_DIR = path.join(__dirname, "../logs");
const LOG_FILE = path.join(LOG_DIR, "app.log");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function formatEntry(level: string, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta !== undefined ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level}] ${message}${metaStr}\n`;
}

function writeToFile(level: string, message: string, meta?: unknown) {
  try {
    ensureLogDir();
    fs.appendFileSync(LOG_FILE, formatEntry(level, message, meta));
  } catch (err) {
    console.error("Failed to write to log file:", err);
  }
}

export const logger = {
  info(message: string, meta?: unknown) {
    const line = formatEntry("INFO", message, meta).trim();
    console.log(line);
    writeToFile("INFO", message, meta);
  },
  error(message: string, meta?: unknown) {
    const line = formatEntry("ERROR", message, meta).trim();
    console.error(line);
    writeToFile("ERROR", message, meta);
  },
  warn(message: string, meta?: unknown) {
    const line = formatEntry("WARN", message, meta).trim();
    console.warn(line);
    writeToFile("WARN", message, meta);
  },
  getLogPath() {
    return LOG_FILE;
  },
};
