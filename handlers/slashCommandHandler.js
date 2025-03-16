const { REST, Routes } = require('discord.js');
const logger = require('../utils/logger');

async function registerSlashCommands(client) {
    try {
        const commands = [
            {
                name: 'log',
                description: 'Log a monster encounter'
            },
            {
                name: 'progress',
                description: 'Check your logged encounters'
            }
        ];

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        logger.info('Started refreshing slash commands...');

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );

        logger.info('Successfully registered slash commands.');
    } catch (error) {
        logger.error('Error registering slash commands:', error);
    }
}

module.exports = {
    registerSlashCommands
};
