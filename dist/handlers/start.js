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
exports.startHandler = startHandler;
const telegraf_1 = require("telegraf");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const welcomeImagePath = path.join(__dirname, "../../assets/welcome.jpg");
const welcomeImagePathAlt = path.join(__dirname, "../../assets/welcome.png");
function isPhotoDimensionsError(error) {
    const e = error;
    return (e?.response?.error_code === 400 &&
        e?.response?.description?.includes("PHOTO_INVALID_DIMENSIONS") === true);
}
async function startHandler(ctx) {
    const welcomeMessage = `*Beabkegn & Blen's Wedding Celebration!* 💍✨

Discover all wedding details, get key updates, and join the joy! ⏰🎉

Stay tuned for more! 🎈💕
  `;
    const WEDDING_WEBSITE_URL = "https://beabkegn-and-blen-wedding.gt.tc";
    const keyboard = telegraf_1.Markup.inlineKeyboard([
        [
            telegraf_1.Markup.button.callback("📍 Time & Place", "wedding_details"),
            telegraf_1.Markup.button.callback("⏳ Countdown", "countdown"),
        ],
        [
            telegraf_1.Markup.button.callback("🖼 Photos", "photos"),
            telegraf_1.Markup.button.callback("⏰ Remind Me", "remind_me"),
        ],
        [
            telegraf_1.Markup.button.callback("💌 Message to Us", "message_couple"),
            telegraf_1.Markup.button.callback("📤 Share a Picture", "share_picture"),
        ],
        [telegraf_1.Markup.button.url("🌐 Visit our Wedding Website", WEDDING_WEBSITE_URL)],
    ]);
    // Check if welcome image exists
    const hasWelcomeImage = fs.existsSync(welcomeImagePath) || fs.existsSync(welcomeImagePathAlt);
    const imagePath = fs.existsSync(welcomeImagePath)
        ? welcomeImagePath
        : welcomeImagePathAlt;
    // Check if this is a callback query (button click) or a command
    if ("callback_query" in ctx.update) {
        // Answer callback query immediately to prevent timeout
        await ctx.answerCbQuery().catch(() => {
            // Ignore if already answered or invalid
        });
        try {
            if (hasWelcomeImage) {
                await ctx.editMessageMedia({
                    type: "photo",
                    media: { source: imagePath },
                    caption: welcomeMessage,
                    parse_mode: "Markdown",
                }, keyboard);
            }
            else {
                await ctx.editMessageText(welcomeMessage, {
                    parse_mode: "Markdown",
                    ...keyboard,
                });
            }
        }
        catch (error) {
            if (isPhotoDimensionsError(error)) {
                await ctx.editMessageText(welcomeMessage, {
                    parse_mode: "Markdown",
                    ...keyboard,
                });
                return;
            }
            // Ignore "message is not modified" error - happens when user clicks same button again
            if (error.response?.error_code === 400 &&
                error.response?.description?.includes("message is not modified")) {
                // Message is already correct, just ignore the error
                return;
            }
            // For other errors, try to send a new message
            if (hasWelcomeImage) {
                try {
                    await ctx.replyWithPhoto({ source: imagePath }, {
                        caption: welcomeMessage,
                        parse_mode: "Markdown",
                        ...keyboard,
                    });
                }
                catch (replyError) {
                    if (isPhotoDimensionsError(replyError)) {
                        await ctx.replyWithMarkdown(welcomeMessage, keyboard);
                    }
                    else {
                        throw replyError;
                    }
                }
            }
            else {
                await ctx.replyWithMarkdown(welcomeMessage, keyboard);
            }
        }
    }
    else {
        if (hasWelcomeImage) {
            try {
                await ctx.replyWithPhoto({ source: imagePath }, {
                    caption: welcomeMessage,
                    parse_mode: "Markdown",
                    ...keyboard,
                });
            }
            catch (error) {
                if (isPhotoDimensionsError(error)) {
                    await ctx.replyWithMarkdown(welcomeMessage, keyboard);
                }
                else {
                    throw error;
                }
            }
        }
        else {
            await ctx.replyWithMarkdown(welcomeMessage, keyboard);
        }
    }
}
