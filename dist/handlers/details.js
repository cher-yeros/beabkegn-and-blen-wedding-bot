"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detailsHandler = detailsHandler;
const config_1 = require("../config");
const telegraf_1 = require("telegraf");
async function detailsHandler(ctx) {
    // Answer callback query immediately to prevent timeout
    if (ctx.callbackQuery) {
        await ctx.answerCbQuery().catch(() => {
            // Ignore if already answered or invalid
        });
    }
    const weddingDate = new Date(config_1.config.weddingDate);
    const formattedDate = weddingDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const formattedTime = weddingDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });
    const detailsMessage = `
📅 *Wedding Details*

*📅 Date:* ${formattedDate} / ጥር 23፣ 2018
*⏰ Time:* ${formattedTime} / ከቀኑ 09፡00

*📍 Venue:* 
Name: ${config_1.config.venueName}
Address: Agona Cinema, Behind Hallelujah Hospital
Google Maps: [Open in Google Maps](${config_1.config.googleMapsUrl})
  `;
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
                await ctx.reply(detailsMessage, {
                    parse_mode: 'Markdown',
                    ...keyboard,
                });
                return;
            }
        }
        // Try to edit as text message
        await ctx.editMessageText(detailsMessage, {
            parse_mode: 'Markdown',
            ...keyboard,
        });
    }
    catch (error) {
        // If editing fails (e.g., message doesn't have text), send a new message
        if (error.response?.error_code === 400 && error.response?.description?.includes('no text')) {
            await ctx.reply(detailsMessage, {
                parse_mode: 'Markdown',
                ...keyboard,
            });
        }
        else {
            throw error;
        }
    }
}
