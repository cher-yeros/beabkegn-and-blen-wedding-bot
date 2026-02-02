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
exports.remindersHandler = remindersHandler;
const telegraf_1 = require("telegraf");
const dayjs_1 = __importDefault(require("dayjs"));
const config_1 = require("../config");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const remindersFile = path.join(__dirname, "../../storage/reminders.json");
/** Edit message text, or delete and reply if edit fails (e.g. photo message, message already gone). */
async function editMessageTextOrReply(ctx, text, extra) {
    try {
        await ctx.editMessageText(text, extra);
    }
    catch (err) {
        const e = err;
        const description = e?.response?.description ?? e?.message ?? "";
        const cannotEdit = description.includes("no text in the message to edit") ||
            description.includes("message to edit not found");
        if (cannotEdit) {
            try {
                await ctx.deleteMessage();
            }
            catch {
                // Ignore delete errors
            }
            await ctx.reply(text, extra);
        }
        else {
            throw err;
        }
    }
}
// Ensure storage directory exists
const storageDir = path.join(__dirname, "../../storage");
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}
// Load reminders from file
function loadReminders() {
    if (!fs.existsSync(remindersFile)) {
        return {};
    }
    try {
        const data = fs.readFileSync(remindersFile, "utf-8");
        return JSON.parse(data);
    }
    catch (error) {
        console.error("Error loading reminders:", error);
        return {};
    }
}
// Save reminders to file
function saveReminders(reminders) {
    fs.writeFileSync(remindersFile, JSON.stringify(reminders, null, 2));
}
// Set a reminder timeout
function setReminder(userId, reminderDate, userName) {
    const now = (0, dayjs_1.default)();
    const delay = reminderDate.diff(now);
    if (delay <= 0) {
        return; // Don't set reminders in the past
    }
    setTimeout(async () => {
        // This would need access to bot instance - we'll handle this differently
        // For now, we'll store the reminder and check it periodically
        console.log(`Reminder set for user ${userId} at ${reminderDate.format()}`);
    }, delay);
}
async function remindersHandler(ctx, setUserState, getUserState) {
    const userId = ctx.from?.id.toString();
    if (!userId)
        return;
    // Check if this is a callback query (button click)
    if ("callback_query" in ctx.update) {
        // Answer callback query immediately to prevent timeout
        await ctx.answerCbQuery().catch(() => {
            // Ignore if already answered or invalid
        });
        const callbackQuery = ctx.update.callback_query;
        const data = "data" in callbackQuery ? callbackQuery.data : "";
        // Initial "remind_me" button click
        if (data === "remind_me") {
            const message = `
⏰ *Set a Reminder*

When would you like to be reminded about the wedding?

Choose an option:
      `;
            const keyboard = telegraf_1.Markup.inlineKeyboard([
                [
                    telegraf_1.Markup.button.callback("1 Day Before", "reminder_1day"),
                    telegraf_1.Markup.button.callback("1 Week Before", "reminder_1week"),
                ],
                [telegraf_1.Markup.button.callback("Custom Date", "reminder_custom")],
                [telegraf_1.Markup.button.callback("🔙 Back to Menu", "start")],
            ]);
            await editMessageTextOrReply(ctx, message, {
                parse_mode: "Markdown",
                ...keyboard,
            });
            return;
        }
        // Handle reminder option selections
        const weddingDate = (0, dayjs_1.default)(config_1.config.weddingDate);
        let reminderDate;
        let reminderText = "";
        if (data === "reminder_1day") {
            reminderDate = weddingDate.subtract(1, "day");
            reminderText = "1 day before the wedding";
        }
        else if (data === "reminder_1week") {
            reminderDate = weddingDate.subtract(1, "week");
            reminderText = "1 week before the wedding";
        }
        else if (data === "reminder_custom") {
            if (setUserState) {
                setUserState(userId, "waiting_reminder_date");
            }
            await editMessageTextOrReply(ctx, "📅 Please send me the date in format: YYYY-MM-DD\n\nExample: 2026-08-10", telegraf_1.Markup.inlineKeyboard([[telegraf_1.Markup.button.callback("🔙 Cancel", "start")]]));
            return;
        }
        else {
            return;
        }
        // Save reminder for predefined options
        if (data === "reminder_1day" || data === "reminder_1week") {
            const reminders = loadReminders();
            if (!reminders[userId]) {
                reminders[userId] = [];
            }
            reminders[userId].push({
                date: reminderDate.format(),
                text: reminderText,
                createdAt: (0, dayjs_1.default)().format(),
            });
            saveReminders(reminders);
            await editMessageTextOrReply(ctx, `✅ Reminder set for ${reminderText}!\n\nYou'll receive a notification on ${reminderDate.format("MMMM D, YYYY")}.`, telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback("🔙 Back to Menu", "start")],
            ]));
        }
        return;
    }
    // Handle custom date input (text message)
    if ("message" in ctx.update && "text" in ctx.update.message) {
        const state = getUserState ? getUserState(userId) : undefined;
        // Only process if user is in reminder state
        if (state !== "waiting_reminder_date") {
            return;
        }
        const text = ctx.update.message.text;
        const customDate = (0, dayjs_1.default)(text);
        if (!customDate.isValid()) {
            await ctx.reply("❌ Invalid date format. Please use YYYY-MM-DD format.\n\nExample: 2026-08-10", telegraf_1.Markup.inlineKeyboard([[telegraf_1.Markup.button.callback("🔙 Cancel", "start")]]));
            return;
        }
        const weddingDate = (0, dayjs_1.default)(config_1.config.weddingDate);
        if (customDate.isAfter(weddingDate)) {
            await ctx.reply("❌ Reminder date cannot be after the wedding date. Please try again.", telegraf_1.Markup.inlineKeyboard([[telegraf_1.Markup.button.callback("🔙 Cancel", "start")]]));
            return;
        }
        // Save reminder
        const reminders = loadReminders();
        if (!reminders[userId]) {
            reminders[userId] = [];
        }
        reminders[userId].push({
            date: customDate.format(),
            text: `Custom reminder for ${customDate.format("MMMM D, YYYY")}`,
            createdAt: (0, dayjs_1.default)().format(),
        });
        saveReminders(reminders);
        if (setUserState) {
            setUserState(userId, "");
        }
        await ctx.reply(`✅ Reminder set for ${customDate.format("MMMM D, YYYY")}!`, telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback("🔙 Back to Menu", "start")],
        ]));
    }
}
