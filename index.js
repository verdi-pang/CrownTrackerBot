require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./utils/logger');

// Updated intents configuration with all required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildIntegrations
    ]
});

client.commands = new Collection();

// Load commands
loadCommands(client);

// Load events
(async () => {
    try {
        const eventFiles = await fs.readdir(path.join(__dirname, 'events'));

        for (const file of eventFiles) {
            if (!file.endsWith('.js')) continue;

            const event = require(`./events/${file}`);
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }

            logger.info(`Loaded event: ${event.name}`);
        }
    } catch (error) {
        logger.error('Error loading events:', error);
    }
})();

// Login to Discord
const token = process.env.DISCORD_TOKEN;
if (!token) {
    logger.error('Discord token is missing in environment variables!');
    process.exit(1);
}

client.login(token).catch(error => {
    logger.error('Error logging in to Discord:', error);
    process.exit(1);
});