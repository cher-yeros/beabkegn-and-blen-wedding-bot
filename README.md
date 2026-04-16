# Beabkegn & Blen Wedding Bot 🤵👰

A Telegram bot for wedding information, media sharing, reminders, and guest interaction.

## Features

- 📍 **Wedding Details** - Date, time, venue, and location
- ⏳ **Countdown** - Real-time countdown to the wedding day
- 🖼 **Photos** - View wedding photos from local storage
- ⏰ **Remind Me** - Set reminders (1 day, 1 week, or custom date)
- 💬 **Message to Couple** - Send messages that are forwarded to admin
- 📤 **Picture Sharing** - Upload and share photos with the couple

## Setup

### Prerequisites

- Node.js (LTS version)
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- Your Telegram User ID (for admin notifications)

### Installation

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Edit `.env` and fill in your values:
```
BOT_TOKEN=your_bot_token_here
ADMIN_ID=your_telegram_user_id
WEDDING_DATE=2026-08-15T14:00:00
VENUE_NAME=Your Venue Name
GOOGLE_MAPS_URL=https://maps.google.com/...
```

### Getting Your Bot Token

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` and follow the instructions
3. Copy the bot token you receive

### Getting Your Telegram User ID

1. Search for [@userinfobot](https://t.me/userinfobot) on Telegram
2. Start a conversation and it will show your user ID
3. Copy the ID number

## Running the Bot

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## Project Structure

```
/bot
 ├── src/
 │   ├── index.ts          # Main bot entry point
 │   ├── config.ts          # Configuration loader
 │   └── handlers/
 │       ├── start.ts       # Welcome & main menu
 │       ├── details.ts     # Wedding details
 │       ├── countdown.ts   # Countdown timer
 │       ├── photos.ts      # Photo gallery
 │       ├── reminders.ts   # Reminder system
 │       ├── messages.ts    # Message handling
 │       └── pictureSharing.ts # Photo uploads
 ├── assets/
 │   └── photos/            # Wedding photos (add your photos here)
 ├── uploads/               # Guest-uploaded photos
 ├── storage/
 │   ├── reminders.json     # Reminder data
 │   └── messages.json      # Guest messages
 ├── .env                   # Environment variables
 └── package.json
```

## Adding Photos

1. Create the `assets/photos/` directory if it doesn't exist
2. Add your wedding photos (JPG, PNG, GIF, or WebP formats)
3. The bot will automatically detect and display them

## Data Storage

- Reminders and messages are stored locally in JSON files in the `storage/` directory
- Photos are saved in the `uploads/` directory
- No cloud dependencies required

## Commands

- `/start` - Start the bot and show main menu

## Notes

- The bot uses inline keyboards for navigation
- All data is stored locally (no database required)
- Admin receives notifications for messages and photo uploads
- Reminders are stored but require a scheduler for automatic sending (can be enhanced)

## License

ISC
