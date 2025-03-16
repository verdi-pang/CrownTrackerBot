const { REST, Routes } = require('discord.js');
const logger = require('../utils/logger');

async function registerSlashCommands(client) {
    try {
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
        logger.info('Started refreshing slash commands...');

        // First, remove all existing commands
        try {
            logger.info('Removing existing commands...');
            await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
            logger.info('Successfully removed all existing commands');
        } catch (error) {
            logger.error('Error removing existing commands:', error);
        }

        // Register new commands globally
        try {
            logger.info(`Registering ${commands.length} commands globally...`);
            const result = await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commands }
            );
            logger.info(`Successfully registered ${result.length} global commands`);
            logger.info('Registered commands:', commands.map(cmd => cmd.name).join(', '));
        } catch (error) {
            logger.error('Failed to register global commands:', error);
        }
    } catch (error) {
        logger.error('Error registering slash commands:', error);
    }
}

module.exports = {
    registerSlashCommands
};