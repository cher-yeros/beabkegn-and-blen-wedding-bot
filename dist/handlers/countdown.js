"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.countdownHandler = countdownHandler;
const dayjs_1 = __importDefault(require("dayjs"));
const duration_1 = __importDefault(require("dayjs/plugin/duration"));
const config_1 = require("../config");
const telegraf_1 = require("telegraf");
dayjs_1.default.extend(duration_1.default);
async function countdownHandler(ctx) {
    // Answer callback query immediately to prevent timeout
    if (ctx.callbackQuery) {
        await ctx.answerCbQuery().catch(() => {
            // Ignore if already answered or invalid
        });
    }
    const weddingDate = (0, dayjs_1.default)(config_1.config.weddingDate);
    const now = (0, dayjs_1.default)();
    const diff = weddingDate.diff(now);
    let countdownMessage = '';
    if (diff <= 0) {
        countdownMessage = `
🎉 *It's Wedding Day!* 🎉

The big day has arrived! We can't wait to celebrate with you!
    `;
    }
    else {
        const duration = dayjs_1.default.duration(diff);
        const days = Math.floor(duration.asDays());
        const hours = duration.hours();
        const minutes = duration.minutes();
        const seconds = duration.seconds();
        countdownMessage = `
⏳ *Countdown to the Big Day*

*${days}* days, *${hours}* hours, *${minutes}* minutes, and *${seconds}* seconds

until Abela & Hanich's wedding! 💕
    `;
    }
    const keyboard = telegraf_1.Markup.inlineKeyboard([
        [telegraf_1.Markup.button.callback('🔙 Back to Menu', 'start')],
    ]);
    try {
        // Check if the message is a callback query from a media message
        if (ctx.callbackQuery && 'message' in ctx.callbackQuery) {
            const message = ctx.callbackQuery.message;
            // If message has photo or other media, delete it and send a new text message
            if (message && ('photo' in message || 'video' in message || 'document' in message)) {
                try {
                    await ctx.deleteMessage();
                }
                catch (e) {
                    // Ignore if message can't be deleted
                }
                await ctx.reply(countdownMessage, {
                    parse_mode: 'Markdown',
                    ...keyboard,
                });
                return;
            }
        }
        // Try to edit as text message
        await ctx.editMessageText(countdownMessage, {
            parse_mode: 'Markdown',
            ...keyboard,
        });
    }
    catch (error) {
        // If editing fails (e.g., message doesn't have text), send a new message
        if (error.response?.error_code === 400 && error.response?.description?.includes('no text')) {
            await ctx.reply(countdownMessage, {
                parse_mode: 'Markdown',
                ...keyboard,
            });
        }
        else {
            throw error;
        }
    }
}
