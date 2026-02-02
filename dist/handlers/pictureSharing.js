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
exports.pictureSharingHandler = pictureSharingHandler;
const telegraf_1 = require("telegraf");
const config_1 = require("../config");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const https = __importStar(require("https"));
const uploadsDir = path.join(__dirname, "../../uploads");
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
// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
// Download photo from Telegram
async function downloadPhoto(ctx, fileId) {
    try {
        const file = await ctx.telegram.getFile(fileId);
        const filePath = file.file_path;
        if (!filePath)
            return null;
        const fileUrl = `https://api.telegram.org/file/bot${config_1.config.botToken}/${filePath}`;
        const fileName = `${Date.now()}_${filePath.split("/").pop()}`;
        const localPath = path.join(uploadsDir, fileName);
        // Download file using https
        return new Promise((resolve, reject) => {
            const fileStream = fs.createWriteStream(localPath);
            https
                .get(fileUrl, (response) => {
                if (response.statusCode !== 200) {
                    fileStream.close();
                    fs.unlinkSync(localPath);
                    reject(new Error(`Failed to download file: ${response.statusCode}`));
                    return;
                }
                response.pipe(fileStream);
                fileStream.on("finish", () => {
                    fileStream.close();
                    resolve(localPath);
                });
            })
                .on("error", (err) => {
                fileStream.close();
                if (fs.existsSync(localPath)) {
                    fs.unlinkSync(localPath);
                }
                reject(err);
            });
        });
    }
    catch (error) {
        console.error("Error downloading photo:", error);
        return null;
    }
}
// Notify admin about new photo
async function notifyAdmin(ctx, userName, photoPath) {
    try {
        const adminMessage = `📤 *New Photo Shared*\n\n*From:* ${userName}\n\nA guest has shared a photo with you!`;
        // Send message to admin
        await ctx.telegram.sendMessage(config_1.config.adminId, adminMessage, {
            parse_mode: "Markdown",
        });
        // Send the photo to admin
        await ctx.telegram.sendPhoto(config_1.config.adminId, { source: photoPath });
    }
    catch (error) {
        console.error("Error notifying admin:", error);
    }
}
async function pictureSharingHandler(ctx, setUserState, getUserState) {
    const userName = ctx.from?.first_name || "Guest";
    const userId = ctx.from?.id?.toString();
    // Check if this is a callback query (button click)
    if ("callback_query" in ctx.update) {
        // Answer callback query immediately to prevent timeout
        await ctx.answerCbQuery().catch(() => {
            // Ignore if already answered or invalid
        });
        const message = `
📤 *Share a Picture*

We'd love to see your photos! Please send us a picture.

Your photo will be saved and forwarded to Abela & Hanich.
    `;
        const keyboard = telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback("🔙 Cancel", "start")],
        ]);
        if (setUserState && userId) {
            setUserState(userId, "waiting_photo");
        }
        await editMessageTextOrReply(ctx, message, {
            parse_mode: "Markdown",
            ...keyboard,
        });
        return;
    }
    // Handle photo upload
    if ("message" in ctx.update && "photo" in ctx.update.message) {
        const state = getUserState && userId ? getUserState(userId) : undefined;
        // Only process if user clicked share picture button (or allow any photo)
        // For simplicity, we'll accept photos from users who clicked the button
        const photos = ctx.update.message.photo;
        if (!photos || photos.length === 0) {
            await ctx.reply("❌ No photo received. Please try again.");
            return;
        }
        // Get the highest quality photo
        const photo = photos[photos.length - 1];
        const fileId = photo.file_id;
        await ctx.reply("📥 Downloading your photo...");
        // Download and save photo
        const photoPath = await downloadPhoto(ctx, fileId);
        if (!photoPath) {
            await ctx.reply("❌ Sorry, there was an error saving your photo. Please try again.");
            return;
        }
        // Notify admin
        await notifyAdmin(ctx, userName, photoPath);
        if (setUserState && userId) {
            setUserState(userId, "");
        }
        await ctx.reply("✅ Thank you for sharing your photo! We've received it. 💕", telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback("🔙 Back to Menu", "start")],
        ]));
    }
}
