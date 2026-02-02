"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.validateBotConfig = validateBotConfig;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    botToken: process.env.BOT_TOKEN || "",
    adminId: parseInt(process.env.ADMIN_ID || "0", 10),
    weddingDate: process.env.WEDDING_DATE || "2026-08-15T14:00:00",
    venueName: process.env.VENUE_NAME || "Wedding Venue",
    googleMapsUrl: process.env.GOOGLE_MAPS_URL || "https://maps.google.com/",
    port: parseInt(process.env.PORT || "3000", 10),
};
/** Call before starting the bot; throws if BOT_TOKEN or ADMIN_ID are missing/invalid. */
function validateBotConfig() {
    if (!exports.config.botToken) {
        throw new Error("BOT_TOKEN is required in .env file");
    }
    if (!process.env.ADMIN_ID) {
        throw new Error("ADMIN_ID is required in .env file");
    }
    if (isNaN(exports.config.adminId) || exports.config.adminId === 0) {
        throw new Error(`ADMIN_ID must be a valid non-zero number. Current value: "${process.env.ADMIN_ID}"`);
    }
}
