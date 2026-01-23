import { Context } from 'telegraf';
import { Markup } from 'telegraf';
import * as fs from 'fs';
import * as path from 'path';

const photosDir = path.join(__dirname, '../../assets/photos');

export async function photosHandler(ctx: Context) {
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
      await ctx.editMessageText(
        '📁 Photos folder created. Please add photos to the /assets/photos directory.',
        Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Back to Menu', 'start')],
        ])
      );
      return;
    }

    // Get all image files from photos directory
    const files = fs.readdirSync(photosDir);
    const imageFiles = files.filter((file) =>
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );

    if (imageFiles.length === 0) {
      await ctx.editMessageText(
        '📷 No photos available yet. Check back soon!',
        Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Back to Menu', 'start')],
        ])
      );
      return;
    }

    // Send photos as media group (album)
    if (imageFiles.length === 1) {
      // Single photo
      const photoPath = path.join(photosDir, imageFiles[0]);
      try {
        await ctx.deleteMessage();
      } catch (e) {
        // Ignore if message can't be deleted
      }
      await ctx.replyWithPhoto(
        { source: photoPath },
        Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Back to Menu', 'start')],
        ])
      );
    } else {
      // Multiple photos as media group
      try {
        await ctx.deleteMessage();
      } catch (e) {
        // Ignore if message can't be deleted
      }
      const media = imageFiles.slice(0, 10).map((file) => ({
        type: 'photo' as const,
        media: { source: path.join(photosDir, file) },
      }));

      await ctx.replyWithMediaGroup(media);
      await ctx.reply(
        `📷 Here are ${imageFiles.length} photos from our wedding!`,
        Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Back to Menu', 'start')],
        ])
      );
    }
  } catch (error) {
    console.error('Error sending photos:', error);
    await ctx.editMessageText(
      '❌ Sorry, there was an error loading the photos. Please try again later.',
      Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Back to Menu', 'start')],
      ])
    );
  }
}
