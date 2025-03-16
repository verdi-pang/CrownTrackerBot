const logger = require('../utils/logger');
const { registerSlashCommands } = require('../handlers/slashCommandHandler');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        try {
            logger.info(`Logged in as ${client.user.tag}`);
            logger.info(`Bot ID: ${client.user.id}`); // Log the bot's ID
            client.user.setActivity('Use /track to log monsters', { type: 'PLAYING' });

            // Register slash commands
            await registerSlashCommands(client);
        } catch (error) {
            logger.error('Error in ready event:', error);
        }
    }
};