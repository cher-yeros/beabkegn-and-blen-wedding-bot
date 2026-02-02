"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const LOG_DIR = path.join(__dirname, "../logs");
const LOG_FILE = path.join(LOG_DIR, "app.log");
function ensureLogDir() {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
}
function formatEntry(level, message, meta) {
    const timestamp = new Date().toISOString();
    const metaStr = meta !== undefined ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${level}] ${message}${metaStr}\n`;
}
function writeToFile(level, message, meta) {
    try {
        ensureLogDir();
        fs.appendFileSync(LOG_FILE, formatEntry(level, message, meta));
    }
    catch (err) {
        console.error("Failed to write to log file:", err);
    }
}
exports.logger = {
    info(message, meta) {
        const line = formatEntry("INFO", message, meta).trim();
        console.log(line);
        writeToFile("INFO", message, meta);
    },
    error(message, meta) {
        const line = formatEntry("ERROR", message, meta).trim();
        console.error(line);
        writeToFile("ERROR", message, meta);
    },
    warn(message, meta) {
        const line = formatEntry("WARN", message, meta).trim();
        console.warn(line);
        writeToFile("WARN", message, meta);
    },
    getLogPath() {
        return LOG_FILE;
    },
};
