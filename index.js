require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, ActivityType } = require('discord.js');
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

// Define slash commands
const slashCommands = [
    {
        name: 'ct-track',
        description: 'Track a monster encounter by size (smallest/largest)'
    },
    {
        name: 'ct-progress',
        description: 'Check your logged monster encounters'
    },
    {
        name: 'ct-missing',
        description: 'Show monsters you have not yet tracked by size'
    },
    {
        name: 'ct-language',
        description: 'Set your preferred language for monster names (English/Chinese)'
    }
];

// Register slash commands
async function registerGlobalCommands() {
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        
        logger.info('Started refreshing slash commands...');
        logger.info(`Registering ${slashCommands.length} commands: ${slashCommands.map(cmd => cmd.name).join(', ')}`);

        // First, delete all existing commands to avoid duplicates
        logger.info('Deleting existing commands...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: [] }
        );
        
        // Register fresh commands
        const result = await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: slashCommands }
        );
        
        logger.info(`Successfully registered ${result.length} commands`);
        
        // Verify registration
        const registeredCommands = await rest.get(Routes.applicationCommands(client.user.id));
        logger.info(`Currently registered commands: ${registeredCommands.map(cmd => cmd.name).join(', ')}`);
        
        return true;
    } catch (error) {
        logger.error('Error registering slash commands:', error);
        return false;
    }
}

// Load commands (for command handling)
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
    logger.info(`Logged in as ${client.user.tag} (ID: ${client.user.id})`);
    
    try {
        // Register slash commands
        const registered = await registerGlobalCommands();
        
        if (registered) {
            logger.info('Commands registered successfully');
        } else {
            logger.warn('Command registration failed');
        }
        
        // Set activity status
        client.user.setActivity('Use /ct-track to log monsters', { type: ActivityType.Playing });
    } catch (error) {
        logger.error('Error in ready event:', error);
    }
});

client.login(token).catch(error => {
    logger.error('Error logging in to Discord:', error);
    process.exit(1);
});