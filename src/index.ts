import { Telegraf } from "telegraf";
import express, { Request, Response } from "express";
import { config, validateBotConfig } from "./config";
import { logger } from "./logger";
import { startHandler } from "./handlers/start";
import { detailsHandler } from "./handlers/details";
import { countdownHandler } from "./handlers/countdown";
import { photosHandler } from "./handlers/photos";
import { remindersHandler } from "./handlers/reminders";
import { messagesHandler } from "./handlers/messages";
import { pictureSharingHandler } from "./handlers/pictureSharing";
import * as fs from "fs";
import * as path from "path";

// --- Start HTTP server first so /health and / always respond ---
const app = express();
app.use(express.json());

const photosAssetsPath = path.join(__dirname, "../assets/photos");
if (!fs.existsSync(photosAssetsPath)) {
  fs.mkdirSync(photosAssetsPath, { recursive: true });
}
app.use("/photos", express.static(photosAssetsPath));

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, message: "Wedding Bot API" });
});

app.get("/health", (_req: Request, res: Response) => {
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
      } catch {
        healthStatus.checks.storage = "readonly";
        healthStatus.status = "degraded";
      }
    } else {
      healthStatus.checks.storage = "missing";
      healthStatus.status = "degraded";
    }
  } catch {
    healthStatus.checks.storage = "error";
    healthStatus.status = "degraded";
  }
  const statusCode = healthStatus.status === "ok" ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

app.listen(config.port, "0.0.0.0", () => {
  logger.info(`Health check server running on http://0.0.0.0:${config.port}`);
});
// --- End HTTP server (now listening before bot runs) ---

const bot = new Telegraf(config.botToken);

const userStates: Record<string, string> = {};
const stateFile = path.join(__dirname, "../storage/userStates.json");

function loadStates() {
  if (fs.existsSync(stateFile)) {
    try {
      const data = fs.readFileSync(stateFile, "utf-8");
      Object.assign(userStates, JSON.parse(data));
    } catch (error) {
      logger.error("Error loading user states", { error: String(error) });
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

function setUserState(userId: string, state: string) {
  userStates[userId] = state;
  saveStates();
}

function getUserState(userId: string): string | undefined {
  return userStates[userId];
}

function clearUserState(userId: string) {
  delete userStates[userId];
  saveStates();
}

loadStates();

// Register command handlers
bot.command("start", async (ctx) => {
  const userId = ctx.from?.id.toString();
  if (userId) clearUserState(userId);
  await startHandler(ctx);
});

// Register callback query handlers (for inline keyboard buttons)
bot.action("start", async (ctx) => {
  const userId = ctx.from?.id.toString();
  if (userId) clearUserState(userId);
  await startHandler(ctx);
});

bot.action("wedding_details", detailsHandler);
bot.action("countdown", countdownHandler);
bot.action("photos", photosHandler);
bot.action(/^photos_page:\d+$/, photosHandler);
bot.action("remind_me", async (ctx) => {
  await remindersHandler(ctx, setUserState);
});
bot.action("message_couple", async (ctx) => {
  await messagesHandler(ctx, setUserState);
});
bot.action("share_picture", async (ctx) => {
  await pictureSharingHandler(ctx, setUserState);
});

// Handle reminder callback queries
bot.action(/^reminder_(1day|1week|custom)$/, async (ctx) => {
  await remindersHandler(ctx, setUserState);
});

// Handle text messages (for reminder dates and messages to couple)
bot.on("text", async (ctx) => {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const state = getUserState(userId);

  if (state === "waiting_message") {
    await messagesHandler(ctx, setUserState, getUserState);
    return;
  }

  if (state === "waiting_reminder_date") {
    await remindersHandler(ctx, setUserState, getUserState);
    return;
  }
});

// Handle photo uploads
bot.on("photo", async (ctx) => {
  await pictureSharingHandler(ctx, setUserState, getUserState);
});

// Error handling
bot.catch((err, ctx) => {
  logger.error(`Error for ${ctx.updateType}`, {
    error: String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  ctx.reply("Sorry, something went wrong. Please try again later.");
});

// Global uncaught errors → log file
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { error: String(err), stack: err.stack });
  process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection", { reason: String(reason) });
});

// Start bot only if config is valid; server is already up so /health works either way
try {
  validateBotConfig();
  bot
    .launch()
    .then(() => {
      logger.info("Wedding Bot is running", { logFile: logger.getLogPath() });
    })
    .catch((err) => {
      logger.error("Failed to start bot", {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    });
} catch (err) {
  logger.error("Bot config invalid – bot not started", { error: String(err) });
}

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
