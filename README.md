# Crown Tracker Discord Bot

A Discord bot for tracking Monster Hunter game achievements. Track the smallest and largest monsters you've encountered and view your progress statistics.

## Features

- Track monster encounters by size (smallest/largest)
- View progress stats on your monster collection
- See which monsters you haven't yet tracked
- Multi-language support (English and Traditional Chinese)
- Discord slash commands with "ct-" prefix

## Commands

- `/ct-track` - Track a new monster encounter by size
- `/ct-progress` - Check your current monster tracking progress
- `/ct-missing` - Show monsters you haven't tracked yet by size
- `/ct-language` - Set your preferred language (English/Chinese)

## Setup Instructions

### Local Development

1. Clone this repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and add your Discord token
4. Start the bot: `node index.js`

### Deployment on Railway

1. Create a new project on [Railway](https://railway.app/)
2. Connect to your GitHub repository
3. Add environment variable: `DISCORD_TOKEN`
4. Railway will automatically deploy your bot

## Database

The bot currently uses SQLite for data storage. For Railway deployment, you can:
1. Use Railway's Volume service for persistent SQLite storage
2. Migrate to PostgreSQL (recommended for production)

## License

MIT