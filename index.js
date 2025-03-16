require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
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

// Register slash commands
async function registerGlobalCommands() {
    try {
        if (!client.user) {
            logger.error('Client user not available. Ensure bot is logged in before registering commands.');
            return;
        }

        logger.info('Starting global command registration...');
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        // First, remove all existing commands globally
        logger.info('Removing all existing global commands...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
        logger.info('Successfully removed all existing global commands');

        // Remove guild-specific commands if any exist
        const guilds = client.guilds.cache;
        for (const [guildId, guild] of guilds) {
            logger.info(`Removing commands from guild: ${guild.name}`);
            await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: [] });
        }

        // Define the new commands
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

        // Register new commands globally
        logger.info(`Registering ${commands.length} global commands...`);
        const result = await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );

        logger.info(`Successfully registered ${result.length} commands: ${commands.map(cmd => cmd.name).join(', ')}`);

        // Verify registration
        const registeredCommands = await rest.get(Routes.applicationCommands(client.user.id));
        logger.info(`Currently registered commands: ${registeredCommands.map(cmd => cmd.name).join(', ')}`);
    } catch (error) {
        logger.error('Error registering slash commands:', error);
    }
}

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

// Login to Discord and register commands
const token = process.env.DISCORD_TOKEN;
if (!token) {
    logger.error('Discord token is missing in environment variables!');
    process.exit(1);
}

client.once('ready', async () => {
    logger.info(`Logged in as ${client.user.tag}`);
    try {
        // Register slash commands only after bot is fully ready
        await registerGlobalCommands();
        client.user.setActivity('Use /track to log monsters', { type: 'PLAYING' });
    } catch (error) {
        logger.error('Error in ready event:', error);
    }
});

client.login(token).catch(error => {
    logger.error('Error logging in to Discord:', error);
    process.exit(1);
});