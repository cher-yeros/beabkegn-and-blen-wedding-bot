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
exports.messagesHandler = messagesHandler;
const telegraf_1 = require("telegraf");
const config_1 = require("../config");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const messagesFile = path.join(__dirname, "../../storage/messages.json");
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
// Load messages from file
function loadMessages() {
    if (!fs.existsSync(messagesFile)) {
        return [];
    }
    try {
        const data = fs.readFileSync(messagesFile, "utf-8");
        return JSON.parse(data);
    }
    catch (error) {
        console.error("Error loading messages:", error);
        return [];
    }
}
// Save messages to file
function saveMessages(messages) {
    fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));
}
// Forward message to admin
async function forwardToAdmin(ctx, message, userName) {
    try {
        const adminMessage = `💬 *New Message from Guest*\n\n*From:* ${userName}\n\n${message}`;
        await ctx.telegram.sendMessage(config_1.config.adminId, adminMessage, {
            parse_mode: "Markdown",
        });
    }
    catch (error) {
        console.error("Error forwarding message to admin:", error);
    }
}
async function messagesHandler(ctx, setUserState, getUserState) {
    const userId = ctx.from?.id?.toString();
    const userName = ctx.from?.first_name || "Guest";
    if (!userId)
        return;
    // Check if this is a callback query (button click)
    if ("callback_query" in ctx.update) {
        // Answer callback query immediately to prevent timeout
        await ctx.answerCbQuery().catch(() => {
            // Ignore if already answered or invalid
        });
        const message = `
💬 *Message to the Couple*

We'd love to hear from you! Please send us your message below.

Your message will be forwarded to Beabkegn & Blen.
    `;
        const keyboard = telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback("🔙 Cancel", "start")],
        ]);
        if (setUserState) {
            setUserState(userId, "waiting_message");
        }
        await editMessageTextOrReply(ctx, message, {
            parse_mode: "Markdown",
            ...keyboard,
        });
        return;
    }
    // Handle text message (actual message from user)
    if ("message" in ctx.update && "text" in ctx.update.message) {
        const state = getUserState ? getUserState(userId) : undefined;
        // Only process if user is in message state
        if (state !== "waiting_message") {
            return;
        }
        const text = ctx.update.message.text;
        // Skip if it's a command
        if (text?.startsWith("/")) {
            return;
        }
        // Save message
        const messages = loadMessages();
        const messageData = {
            userId: userId,
            userName,
            message: text,
            timestamp: new Date().toISOString(),
        };
        messages.push(messageData);
        saveMessages(messages);
        // Forward to admin
        await forwardToAdmin(ctx, text, userName);
        if (setUserState) {
            setUserState(userId, "");
        }
        await ctx.reply("✅ Thank you for your message! We've received it and will get back to you soon. 💕", telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback("🔙 Back to Menu", "start")],
        ]));
    }
}
