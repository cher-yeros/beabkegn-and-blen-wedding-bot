import { Context } from "telegraf";
import { Markup } from "telegraf";
import { config } from "../config";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

const uploadsDir = path.join(__dirname, "../../uploads");

/** Edit message text, or delete and reply if edit fails (e.g. photo message, message already gone). */
async function editMessageTextOrReply(
  ctx: Context,
  text: string,
  extra: object,
) {
  try {
    await ctx.editMessageText(text, extra);
  } catch (err: unknown) {
    const e = err as { message?: string; response?: { description?: string } };
    const description = e?.response?.description ?? e?.message ?? "";
    const cannotEdit =
      description.includes("no text in the message to edit") ||
      description.includes("message to edit not found");
    if (cannotEdit) {
      try {
        await ctx.deleteMessage();
      } catch {
        // Ignore delete errors
      }
      await ctx.reply(text, extra);
    } else {
      throw err;
    }
  }
}

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Download photo from Telegram
async function downloadPhoto(
  ctx: Context,
  fileId: string,
): Promise<string | null> {
  try {
    const file = await ctx.telegram.getFile(fileId);
    const filePath = file.file_path;
    if (!filePath) return null;

    const fileUrl = `https://api.telegram.org/file/bot${config.botToken}/${filePath}`;
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
            reject(
              new Error(`Failed to download file: ${response.statusCode}`),
            );
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
  } catch (error) {
    console.error("Error downloading photo:", error);
    return null;
  }
}

// Notify admin about new photo
async function notifyAdmin(ctx: Context, userName: string, photoPath: string) {
  try {
    const adminMessage = `📤 *New Photo Shared*\n\n*From:* ${userName}\n\nA guest has shared a photo with you!`;

    // Send message to admin
    await ctx.telegram.sendMessage(config.adminId, adminMessage, {
      parse_mode: "Markdown",
    });

    // Send the photo to admin
    await ctx.telegram.sendPhoto(config.adminId, { source: photoPath });
  } catch (error) {
    console.error("Error notifying admin:", error);
  }
}

export async function pictureSharingHandler(
  ctx: Context,
  setUserState?: (userId: string, state: string) => void,
  getUserState?: (userId: string) => string | undefined,
) {
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

Your photo will be saved and forwarded to Beabkegn & Blen.
    `;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("🔙 Cancel", "start")],
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
      await ctx.reply(
        "❌ Sorry, there was an error saving your photo. Please try again.",
      );
      return;
    }

    // Notify admin
    await notifyAdmin(ctx, userName, photoPath);

    if (setUserState && userId) {
      setUserState(userId, "");
    }

    await ctx.reply(
      "✅ Thank you for sharing your photo! We've received it. 💕",
      Markup.inlineKeyboard([
        [Markup.button.callback("🔙 Back to Menu", "start")],
      ]),
    );
  }
}
