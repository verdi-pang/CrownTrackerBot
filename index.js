require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./utils/logger');

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

// Register slash commands before loading other commands
async function registerGlobalCommands() {
    const commands = [
        {
            name: 'track',
            description: 'Track a monster encounter'
        },
        {
            name: 'progress',
            description: 'Check your logged encounters'
        },
        {
            name: 'missing',
            description: 'Show monsters you have not yet tracked'
        }
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        logger.info('Started refreshing slash commands...');

        // First, remove all existing commands
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
        logger.info('Successfully removed all existing commands');

        // Register new commands
        const result = await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        logger.info(`Successfully registered ${result.length} commands: ${commands.map(cmd => cmd.name).join(', ')}`);

        // Verify the registration
        const registeredCommands = await rest.get(Routes.applicationCommands(client.user.id));
        logger.info(`Currently registered commands: ${registeredCommands.map(cmd => cmd.name).join(', ')}`);
    } catch (error) {
        logger.error('Error registering slash commands:', error);
    }
}

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

// Register commands only once when bot is ready
client.once('ready', async () => {
    logger.info(`Logged in as ${client.user.tag}`);
    try {
        // Register slash commands
        await registerGlobalCommands();
        // Set activity status
        client.user.setActivity('Use /track to log monsters', { type: 'PLAYING' });
    } catch (error) {
        logger.error('Error in ready event:', error);
    }
});

client.login(token).catch(error => {
    logger.error('Error logging in to Discord:', error);
    process.exit(1);
});