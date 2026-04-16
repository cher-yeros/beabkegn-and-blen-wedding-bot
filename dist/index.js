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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const express_1 = __importDefault(require("express"));
const config_1 = require("./config");
const logger_1 = require("./logger");
const start_1 = require("./handlers/start");
const details_1 = require("./handlers/details");
const countdown_1 = require("./handlers/countdown");
const photos_1 = require("./handlers/photos");
const reminders_1 = require("./handlers/reminders");
const messages_1 = require("./handlers/messages");
const pictureSharing_1 = require("./handlers/pictureSharing");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// --- Start HTTP server first so /health and / always respond ---
const app = (0, express_1.default)();
app.use(express_1.default.json());
const photosAssetsPath = path.join(__dirname, "../assets/photos");
if (!fs.existsSync(photosAssetsPath)) {
    fs.mkdirSync(photosAssetsPath, { recursive: true });
}
app.use("/photos", express_1.default.static(photosAssetsPath));
app.get("/", (_req, res) => {
    res.status(200).json({ ok: true, message: "Wedding Bot API" });
});
app.get("/health", (_req, res) => {
    const healthStatus = {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: { bot: "running", storage: "unknown", telegram: "unknown" },
    };
    try {
        const storageDir = path.join(__dirname, "../storage");
        if (fs.existsSync(storageDir)) {
            try {
                fs.accessSync(storageDir, fs.constants.W_OK);
                healthStatus.checks.storage = "writable";
            }
            catch {
                healthStatus.checks.storage = "readonly";
                healthStatus.status = "degraded";
            }
        }
        else {
            healthStatus.checks.storage = "missing";
            healthStatus.status = "degraded";
        }
    }
    catch {
        healthStatus.checks.storage = "error";
        healthStatus.status = "degraded";
    }
    const statusCode = healthStatus.status === "ok" ? 200 : 503;
    res.status(statusCode).json(healthStatus);
});
app.listen(config_1.config.port, "0.0.0.0", () => {
    logger_1.logger.info(`Health check server running on http://0.0.0.0:${config_1.config.port}`);
});
// --- End HTTP server (now listening before bot runs) ---
const bot = new telegraf_1.Telegraf(config_1.config.botToken);
const userStates = {};
const stateFile = path.join(__dirname, "../storage/userStates.json");
function loadStates() {
    if (fs.existsSync(stateFile)) {
        try {
            const data = fs.readFileSync(stateFile, "utf-8");
            Object.assign(userStates, JSON.parse(data));
        }
        catch (error) {
            logger_1.logger.error("Error loading user states", { error: String(error) });
        }
    }
}
function saveStates() {
    const storageDir = path.join(__dirname, "../storage");
    if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
    }
    fs.writeFileSync(stateFile, JSON.stringify(userStates, null, 2));
}
function setUserState(userId, state) {
    userStates[userId] = state;
    saveStates();
}
function getUserState(userId) {
    return userStates[userId];
}
function clearUserState(userId) {
    delete userStates[userId];
    saveStates();
}
loadStates();
// Register command handlers
bot.command("start", async (ctx) => {
    const userId = ctx.from?.id.toString();
    if (userId)
        clearUserState(userId);
    await (0, start_1.startHandler)(ctx);
});
// Register callback query handlers (for inline keyboard buttons)
bot.action("start", async (ctx) => {
    const userId = ctx.from?.id.toString();
    if (userId)
        clearUserState(userId);
    await (0, start_1.startHandler)(ctx);
});
bot.action("wedding_details", details_1.detailsHandler);
bot.action("countdown", countdown_1.countdownHandler);
bot.action("photos", photos_1.photosHandler);
bot.action(/^photos_page:\d+$/, photos_1.photosHandler);
bot.action("remind_me", async (ctx) => {
    await (0, reminders_1.remindersHandler)(ctx, setUserState);
});
bot.action("message_couple", async (ctx) => {
    await (0, messages_1.messagesHandler)(ctx, setUserState);
});
bot.action("share_picture", async (ctx) => {
    await (0, pictureSharing_1.pictureSharingHandler)(ctx, setUserState);
});
// Handle reminder callback queries
bot.action(/^reminder_(1day|1week|custom)$/, async (ctx) => {
    await (0, reminders_1.remindersHandler)(ctx, setUserState);
});
// Handle text messages (for reminder dates and messages to couple)
bot.on("text", async (ctx) => {
    const userId = ctx.from?.id.toString();
    if (!userId)
        return;
    const state = getUserState(userId);
    if (state === "waiting_message") {
        await (0, messages_1.messagesHandler)(ctx, setUserState, getUserState);
        return;
    }
    if (state === "waiting_reminder_date") {
        await (0, reminders_1.remindersHandler)(ctx, setUserState, getUserState);
        return;
    }
});
// Handle photo uploads
bot.on("photo", async (ctx) => {
    await (0, pictureSharing_1.pictureSharingHandler)(ctx, setUserState, getUserState);
});
// Error handling
bot.catch((err, ctx) => {
    logger_1.logger.error(`Error for ${ctx.updateType}`, {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined,
    });
    ctx.reply("Sorry, something went wrong. Please try again later.");
});
// Global uncaught errors → log file
process.on("uncaughtException", (err) => {
    logger_1.logger.error("Uncaught exception", { error: String(err), stack: err.stack });
    process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
    logger_1.logger.error("Unhandled rejection", { reason: String(reason) });
});
// Start bot only if config is valid; server is already up so /health works either way
try {
    (0, config_1.validateBotConfig)();
    bot
        .launch()
        .then(() => {
        logger_1.logger.info("Wedding Bot is running", { logFile: logger_1.logger.getLogPath() });
    })
        .catch((err) => {
        const error = err;
        if (error?.response?.error_code === 409 &&
            error?.response?.description?.includes("terminated by other getUpdates request")) {
            logger_1.logger.error("Failed to start bot: polling conflict", {
                hint: "Another bot instance is already running with the same token. Stop old process(es) and restart this service.",
                error: String(err),
                stack: err instanceof Error ? err.stack : undefined,
            });
            return;
        }
        logger_1.logger.error("Failed to start bot", {
            error: String(err),
            stack: err instanceof Error ? err.stack : undefined,
        });
    });
}
catch (err) {
    logger_1.logger.error("Bot config invalid – bot not started", { error: String(err) });
}
// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
