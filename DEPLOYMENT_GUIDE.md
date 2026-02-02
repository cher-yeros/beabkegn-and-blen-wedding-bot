# cPanel Deployment Guide

This guide covers deploying the Abela & Hanich Wedding Bot to cPanel.

## Prerequisites

1. **cPanel Access**: SSH access enabled on your cPanel account
2. **Node.js Setup**: Node.js application created in cPanel (Node.js Selector)
3. **SSH Key**: SSH key pair for authentication (if using GitHub Actions)

## Option 1: Manual Deployment via cPanel File Manager

### Step 1: Prepare Your Files

1. Build the project locally:

   ```bash
   npm install
   npm run build
   ```

2. Create a deployment package (exclude unnecessary files):
   - `dist/` folder (compiled JavaScript)
   - `package.json`
   - `.env` file (with your bot token)
   - `storage/` folder (create if needed)
   - `assets/` folder (if you have photos)

### Step 2: Upload to cPanel

1. Log into cPanel
2. Open **File Manager**
3. Navigate to your domain's root directory (e.g., `/home/lelahukm/abelhana.lelahub.org`)
4. Upload your files:
   - Upload `dist/` folder
   - Upload `package.json`
   - Upload `.env` file (keep it secure!)

### Step 3: Install Dependencies

1. In cPanel, go to **Terminal** or use **SSH Access**
2. Navigate to your project directory:
   ```bash
   cd /home/lelahukm/abelhana.lelahub.org
   ```
3. Install production dependencies:
   ```bash
   npm install --production
   ```

### Step 4: Set Up Node.js Application in cPanel

1. In cPanel, go to **Node.js Selector** (or **Setup Node.js App**)
2. Create a new application:
   - **Node.js Version**: Select version 18 or 20
   - **Application Root**: `/home/lelahukm/abelhana.lelahub.org`
   - **Application URL**: Your domain/subdomain
   - **Application Startup File**: `dist/index.js`
   - **Application Mode**: Production
3. Add environment variables:
   - Click on your application
   - Add `BOT_TOKEN` (your Telegram bot token)
   - Add any other required environment variables
4. Click **Save** and **Run Node.js App**

### Step 5: Using PM2 (Alternative Method)

If you prefer PM2 for process management:

1. SSH into your server
2. Install PM2 globally (if not already installed):
   ```bash
   npm install -g pm2
   ```
3. Navigate to your project:
   ```bash
   cd /home/lelahukm/abelhana.lelahub.org
   ```
4. Start the application:
   ```bash
   pm2 start dist/index.js --name wedding-bot
   ```
5. Save PM2 configuration:
   ```bash
   pm2 save
   pm2 startup
   ```

## Option 2: Automated Deployment via GitHub Actions

Your project already has a GitHub Actions workflow configured. Here's how to set it up:

### Step 1: Configure GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**, and add:

1. **CPANEL_HOST**: Your cPanel server IP or hostname
   - Example: `abelhana.lelahub.org` or `123.45.67.89`

2. **CPANEL_USERNAME**: Your cPanel username
   - Example: `lelahukm`

3. **CPANEL_SSH_KEY**: Your private SSH key
   - Generate if needed: `ssh-keygen -t rsa -b 4096`
   - Copy the **private key** content (starts with `-----BEGIN RSA PRIVATE KEY-----`)

4. **CPANEL_SSH_PASSPHRASE**: Passphrase for your SSH key (if you set one, otherwise leave empty)

### Step 2: Add SSH Public Key to cPanel

1. Copy your **public key** (usually `~/.ssh/id_rsa.pub`)
2. In cPanel, go to **SSH Access** → **Manage SSH Keys**
3. Click **Import Key** and paste your public key
4. Click **Authorize** to enable it

### Step 3: Verify Deployment Path

Check that the target directory in `.github/workflows/deploy.yml` matches your cPanel setup:

```yaml
target: "/home/lelahukm/abelhana.lelahub.org"
```

### Step 4: Set Up Environment Variables on Server

**Important**: The `.env` file is not deployed (it's in `.gitignore`). You need to create it manually on the server:

1. SSH into your server:
   ```bash
   ssh username@hostname
   ```
2. Navigate to your project:
   ```bash
   cd /home/lelahukm/abelhana.lelahub.org
   ```
3. Create `.env` file:
   ```bash
   nano .env
   ```
4. Add your environment variables (see Environment Variables section above)
5. Save and exit (Ctrl+X, then Y, then Enter)

**Alternative**: Use cPanel Node.js Selector to add environment variables through the interface (recommended).

### Step 5: Deploy

1. Push to the `main` branch:
   ```bash
   git push origin main
   ```
2. GitHub Actions will automatically:
   - Build your project
   - Deploy files via SCP
   - Install dependencies
   - Restart the application

## Important Notes

### Environment Variables

Your `.env` file should contain:

```
BOT_TOKEN=your_telegram_bot_token_here
ADMIN_ID=your_telegram_user_id_here
WEDDING_DATE=2026-08-15T14:00:00
VENUE_NAME=Wedding Venue
GOOGLE_MAPS_URL=https://maps.google.com/
```

**Required Variables:**

- `BOT_TOKEN`: Your Telegram bot token (from @BotFather)
- `ADMIN_ID`: Your Telegram user ID (numeric)

**Optional Variables (have defaults):**

- `WEDDING_DATE`: Wedding date in ISO format (default: 2026-08-15T14:00:00)
- `VENUE_NAME`: Name of the wedding venue (default: "Wedding Venue")
- `GOOGLE_MAPS_URL`: Google Maps link to the venue (default: https://maps.google.com/)

**Security**: Never commit `.env` to Git! It's already in `.gitignore`.

**Note**: When using cPanel Node.js Selector, you can add these as environment variables in the interface instead of using a `.env` file.

### File Permissions

Ensure proper permissions:

```bash
chmod 755 /home/lelahukm/abelhana.lelahub.org
chmod 644 /home/lelahukm/abelhana.lelahub.org/dist/index.js
```

### Storage Directory

The bot creates a `storage/` directory for user states. Ensure it's writable:

```bash
mkdir -p /home/lelahukm/abelhana.lelahub.org/storage
chmod 755 /home/lelahukm/abelhana.lelahub.org/storage
```

### Logs

**Application log file (on server):**

- The app writes to `logs/app.log` in the project directory. To view:
  ```bash
  tail -f /home/lelahukm/abelhana.lelahub.org/logs/app.log
  ```
- Contains startup, errors, and uncaught exceptions with timestamps.

**Deployment logs (GitHub Actions):**

- After each deploy, go to **Actions** → select the latest run → **Summary**.
- Download the **deployment-log-{run_number}** artifact to see which steps ran and whether the deploy succeeded or failed.
- If the deploy succeeded, the step **Fetch server app log** shows the last 200 lines of `logs/app.log` in the run output.

**Other:**

- **cPanel Node.js App**: Check logs in the Node.js Selector interface
- **PM2**: `pm2 logs wedding-bot`
- **SSH**: Check console output in terminal

### Building on the server

If you run `npm run build` on the server (instead of building locally), install **all** dependencies first so TypeScript is available:

```bash
npm install          # full install (includes devDependencies)
npm run build        # compiles TypeScript to dist/
npm prune --production   # optional: remove devDependencies after build
```

Do **not** run `npm install --production` before building, or `tsc` will not be found.

### Troubleshooting

1. **Application won't start**:
   - Verify Node.js version matches (18 or 20)
   - Check that `dist/index.js` exists
   - Verify environment variables are set

2. **Bot not responding**:
   - Check that BOT_TOKEN is correct
   - Verify the bot is running: `pm2 list` or check Node.js app status
   - Check logs for errors

3. **Permission errors**:
   - Ensure storage directory is writable
   - Check file ownership

4. **SSH connection issues**:
   - Verify SSH key is authorized in cPanel
   - Check that SSH access is enabled for your account
   - Test connection: `ssh username@hostname`

## Updating the Application

### Manual Update:

1. Build locally: `npm run build`
2. Upload new `dist/` folder
3. Restart the Node.js app in cPanel or run `pm2 restart wedding-bot`

### Automated Update:

Just push to `main` branch - GitHub Actions handles everything!
