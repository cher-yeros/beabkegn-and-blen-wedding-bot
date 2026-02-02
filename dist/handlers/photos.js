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
exports.photosHandler = photosHandler;
const telegraf_1 = require("telegraf");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const photosDir = path.join(__dirname, "../../assets/photos");
/** Max dimension (px) for Telegram photos to avoid PHOTO_INVALID_DIMENSIONS. */
const MAX_PHOTO_DIMENSION = 1280;
/** Photos per page (Telegram media group max is 10). */
const PHOTOS_PER_PAGE = 10;
async function resizePhotoForTelegram(filePath) {
    try {
        return await (0, sharp_1.default)(filePath)
            .resize(MAX_PHOTO_DIMENSION, MAX_PHOTO_DIMENSION, {
            fit: "inside",
            withoutEnlargement: true,
        })
            .jpeg({ quality: 100 })
            .toBuffer();
    }
    catch {
        return null;
    }
}
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
async function photosHandler(ctx) {
    // Answer callback query immediately to prevent timeout
    if (ctx.callbackQuery) {
        await ctx.answerCbQuery().catch(() => {
            // Ignore if already answered or invalid
        });
    }
    try {
        // Check if photos directory exists
        if (!fs.existsSync(photosDir)) {
            fs.mkdirSync(photosDir, { recursive: true });
            await editMessageTextOrReply(ctx, "📁 Photos folder created. Please add photos to the /assets/photos directory.", telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback("🔙 Back to Menu", "start")],
            ]));
            return;
        }
        // Get all image files from photos directory
        const files = fs.readdirSync(photosDir);
        const imageFiles = files.filter((file) => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
        if (imageFiles.length === 0) {
            await editMessageTextOrReply(ctx, "📷 No photos available yet. Check back soon!", telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback("🔙 Back to Menu", "start")],
            ]));
            return;
        }
        const totalCount = imageFiles.length;
        const totalPages = Math.ceil(totalCount / PHOTOS_PER_PAGE) || 1;
        // Parse page from callback: "photos" -> 1, "photos_page:N" -> N
        let page = 1;
        if (ctx.callbackQuery && "data" in ctx.callbackQuery) {
            const data = ctx.callbackQuery.data;
            if (data?.startsWith("photos_page:")) {
                const n = parseInt(data.replace("photos_page:", ""), 10);
                if (!isNaN(n))
                    page = Math.max(1, Math.min(n, totalPages));
            }
        }
        if (totalCount === 1) {
            // Single photo
            const photoPath = path.join(photosDir, imageFiles[0]);
            try {
                await ctx.deleteMessage();
            }
            catch (e) {
                // Ignore if message can't be deleted
            }
            const resized = await resizePhotoForTelegram(photoPath);
            const photoSource = resized ? { source: resized } : { source: photoPath };
            await ctx.replyWithPhoto(photoSource, telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback("🔙 Back to Menu", "start")],
            ]));
            return;
        }
        // Paginated album
        const start = (page - 1) * PHOTOS_PER_PAGE;
        const filesToSend = imageFiles.slice(start, start + PHOTOS_PER_PAGE);
        const media = [];
        for (const file of filesToSend) {
            const filePath = path.join(photosDir, file);
            const resized = await resizePhotoForTelegram(filePath);
            media.push({
                type: "photo",
                media: resized ? { source: resized } : { source: filePath },
            });
        }
        const paginationText = totalPages > 1
            ? `📷 Page ${page} of ${totalPages} — ${totalCount} wedding photos`
            : `📷 Here are ${totalCount} photos from our wedding!`;
        const navButtons = [];
        if (page > 1) {
            navButtons.push(telegraf_1.Markup.button.callback("◀ Previous", `photos_page:${page - 1}`));
        }
        if (page < totalPages) {
            navButtons.push(telegraf_1.Markup.button.callback("Next ▶", `photos_page:${page + 1}`));
        }
        const keyboard = telegraf_1.Markup.inlineKeyboard([
            ...(navButtons.length > 0 ? [navButtons] : []),
            [telegraf_1.Markup.button.callback("🔙 Back to Menu", "start")],
        ]);
        const callbackData = ctx.callbackQuery && "data" in ctx.callbackQuery
            ? ctx.callbackQuery.data
            : undefined;
        const isInitialOpen = callbackData === "photos";
        if (!isInitialOpen) {
            try {
                await ctx.deleteMessage();
            }
            catch (e) {
                // Ignore — keep going so pagination message appears below new album
            }
        }
        else {
            try {
                await ctx.deleteMessage();
            }
            catch (e) {
                // Ignore if message can't be deleted
            }
        }
        await ctx.replyWithMediaGroup(media);
        await ctx.reply(paginationText, keyboard);
    }
    catch (error) {
        console.error("Error sending photos:", error);
        await editMessageTextOrReply(ctx, "❌ Sorry, there was an error loading the photos. Please try again later.", telegraf_1.Markup.inlineKeyboard([
            [telegraf_1.Markup.button.callback("🔙 Back to Menu", "start")],
        ]));
    }
}
