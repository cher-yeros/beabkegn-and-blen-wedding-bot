import { Telegraf } from 'telegraf';
import { config } from './config';
import { startHandler } from './handlers/start';
import { detailsHandler } from './handlers/details';
import { countdownHandler } from './handlers/countdown';
import { photosHandler } from './handlers/photos';
import { remindersHandler } from './handlers/reminders';
import { messagesHandler } from './handlers/messages';
import { pictureSharingHandler } from './handlers/pictureSharing';
import * as fs from 'fs';
import * as path from 'path';

const bot = new Telegraf(config.botToken);

// Simple session state management
const userStates: Record<string, string> = {};
const stateFile = path.join(__dirname, '../storage/userStates.json');

// Load user states
function loadStates() {
  if (fs.existsSync(stateFile)) {
    try {
      const data = fs.readFileSync(stateFile, 'utf-8');
      Object.assign(userStates, JSON.parse(data));
    } catch (error) {
      console.error('Error loading user states:', error);
    }
  }
}

// Save user states
function saveStates() {
  const storageDir = path.join(__dirname, '../storage');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  fs.writeFileSync(stateFile, JSON.stringify(userStates, null, 2));
}

// Set user state
function setUserState(userId: string, state: string) {
  userStates[userId] = state;
  saveStates();
}

// Get user state
function getUserState(userId: string): string | undefined {
  return userStates[userId];
}

// Clear user state
function clearUserState(userId: string) {
  delete userStates[userId];
  saveStates();
}

loadStates();

// Register command handlers
bot.command('start', async (ctx) => {
  const userId = ctx.from?.id.toString();
  if (userId) clearUserState(userId);
  await startHandler(ctx);
});

// Register callback query handlers (for inline keyboard buttons)
bot.action('start', async (ctx) => {
  const userId = ctx.from?.id.toString();
  if (userId) clearUserState(userId);
  await startHandler(ctx);
});

bot.action('wedding_details', detailsHandler);
bot.action('countdown', countdownHandler);
bot.action('photos', photosHandler);
bot.action('remind_me', async (ctx) => {
  await remindersHandler(ctx, setUserState);
});
bot.action('message_couple', async (ctx) => {
  await messagesHandler(ctx, setUserState);
});
bot.action('share_picture', async (ctx) => {
  await pictureSharingHandler(ctx, setUserState);
});

// Handle reminder callback queries
bot.action(/^reminder_(1day|1week|custom)$/, async (ctx) => {
  await remindersHandler(ctx, setUserState);
});

// Handle text messages (for reminder dates and messages to couple)
bot.on('text', async (ctx) => {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const state = getUserState(userId);
  
  if (state === 'waiting_message') {
    await messagesHandler(ctx, setUserState, getUserState);
    return;
  }
  
  if (state === 'waiting_reminder_date') {
    await remindersHandler(ctx, setUserState, getUserState);
    return;
  }
});

// Handle photo uploads
bot.on('photo', async (ctx) => {
  await pictureSharingHandler(ctx, setUserState, getUserState);
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('Sorry, something went wrong. Please try again later.');
});

// Start bot
bot.launch().then(() => {
  console.log('🤵👰 Wedding Bot is running!');
}).catch((err) => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
