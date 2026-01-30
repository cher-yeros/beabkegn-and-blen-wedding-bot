import dotenv from "dotenv";

dotenv.config();

export const config = {
  botToken: process.env.BOT_TOKEN || "",
  adminId: parseInt(process.env.ADMIN_ID || "0", 10),
  weddingDate: process.env.WEDDING_DATE || "2026-08-15T14:00:00",
  venueName: process.env.VENUE_NAME || "Wedding Venue",
  googleMapsUrl: process.env.GOOGLE_MAPS_URL || "https://maps.google.com/",
  port: parseInt(process.env.PORT || "3000", 10),
};

// Validate required environment variables
if (!config.botToken) {
  throw new Error("BOT_TOKEN is required in .env file");
}

if (!process.env.ADMIN_ID) {
  throw new Error("ADMIN_ID is required in .env file");
}

if (isNaN(config.adminId) || config.adminId === 0) {
  throw new Error(
    `ADMIN_ID must be a valid non-zero number. Current value: "${process.env.ADMIN_ID}"`,
  );
}
