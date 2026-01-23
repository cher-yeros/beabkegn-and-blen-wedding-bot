import { Context } from 'telegraf';
import { Markup } from 'telegraf';
import dayjs from 'dayjs';
import { config } from '../config';
import * as fs from 'fs';
import * as path from 'path';

const remindersFile = path.join(__dirname, '../../storage/reminders.json');

// Ensure storage directory exists
const storageDir = path.join(__dirname, '../../storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// Load reminders from file
function loadReminders(): Record<string, any> {
  if (!fs.existsSync(remindersFile)) {
    return {};
  }
  try {
    const data = fs.readFileSync(remindersFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading reminders:', error);
    return {};
  }
}

// Save reminders to file
function saveReminders(reminders: Record<string, any>) {
  fs.writeFileSync(remindersFile, JSON.stringify(reminders, null, 2));
}

// Set a reminder timeout
function setReminder(userId: string, reminderDate: dayjs.Dayjs, userName: string) {
  const now = dayjs();
  const delay = reminderDate.diff(now);

  if (delay <= 0) {
    return; // Don't set reminders in the past
  }

  setTimeout(async () => {
    // This would need access to bot instance - we'll handle this differently
    // For now, we'll store the reminder and check it periodically
    console.log(`Reminder set for user ${userId} at ${reminderDate.format()}`);
  }, delay);
}

export async function remindersHandler(
  ctx: Context,
  setUserState?: (userId: string, state: string) => void,
  getUserState?: (userId: string) => string | undefined
) {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  // Check if this is a callback query (button click)
  if ('callback_query' in ctx.update) {
    // Answer callback query immediately to prevent timeout
    await ctx.answerCbQuery().catch(() => {
      // Ignore if already answered or invalid
    });

    const callbackQuery = ctx.update.callback_query;
    const data = 'data' in callbackQuery ? callbackQuery.data : '';

    // Initial "remind_me" button click
    if (data === 'remind_me') {
      const message = `
⏰ *Set a Reminder*

When would you like to be reminded about the wedding?

Choose an option:
      `;

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('1 Day Before', 'reminder_1day'),
          Markup.button.callback('1 Week Before', 'reminder_1week'),
        ],
        [Markup.button.callback('Custom Date', 'reminder_custom')],
        [Markup.button.callback('🔙 Back to Menu', 'start')],
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...keyboard,
      });
      return;
    }

    // Handle reminder option selections
    const weddingDate = dayjs(config.weddingDate);
    let reminderDate: dayjs.Dayjs;
    let reminderText = '';

    if (data === 'reminder_1day') {
      reminderDate = weddingDate.subtract(1, 'day');
      reminderText = '1 day before the wedding';
    } else if (data === 'reminder_1week') {
      reminderDate = weddingDate.subtract(1, 'week');
      reminderText = '1 week before the wedding';
    } else if (data === 'reminder_custom') {
      if (setUserState) {
        setUserState(userId, 'waiting_reminder_date');
      }
      await ctx.editMessageText(
        '📅 Please send me the date in format: YYYY-MM-DD\n\nExample: 2026-08-10',
        Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Cancel', 'start')],
        ])
      );
      return;
    } else {
      return;
    }

    // Save reminder for predefined options
    if (data === 'reminder_1day' || data === 'reminder_1week') {
      const reminders = loadReminders();
      if (!reminders[userId]) {
        reminders[userId] = [];
      }
      reminders[userId].push({
        date: reminderDate.format(),
        text: reminderText,
        createdAt: dayjs().format(),
      });
      saveReminders(reminders);

      await ctx.editMessageText(
        `✅ Reminder set for ${reminderText}!\n\nYou'll receive a notification on ${reminderDate.format('MMMM D, YYYY')}.`,
        Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Back to Menu', 'start')],
        ])
      );
    }
    return;
  }

  // Handle custom date input (text message)
  if ('message' in ctx.update && 'text' in ctx.update.message) {
    const state = getUserState ? getUserState(userId) : undefined;
    
    // Only process if user is in reminder state
    if (state !== 'waiting_reminder_date') {
      return;
    }

    const text = ctx.update.message.text;
    const customDate = dayjs(text);

    if (!customDate.isValid()) {
      await ctx.reply(
        '❌ Invalid date format. Please use YYYY-MM-DD format.\n\nExample: 2026-08-10',
        Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Cancel', 'start')],
        ])
      );
      return;
    }

    const weddingDate = dayjs(config.weddingDate);
    if (customDate.isAfter(weddingDate)) {
      await ctx.reply(
        '❌ Reminder date cannot be after the wedding date. Please try again.',
        Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Cancel', 'start')],
        ])
      );
      return;
    }

    // Save reminder
    const reminders = loadReminders();
    if (!reminders[userId]) {
      reminders[userId] = [];
    }
    reminders[userId].push({
      date: customDate.format(),
      text: `Custom reminder for ${customDate.format('MMMM D, YYYY')}`,
      createdAt: dayjs().format(),
    });
    saveReminders(reminders);

    if (setUserState) {
      setUserState(userId, '');
    }

    await ctx.reply(
      `✅ Reminder set for ${customDate.format('MMMM D, YYYY')}!`,
      Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Back to Menu', 'start')],
      ])
    );
  }
}
