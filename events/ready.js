const logger = require('../utils/logger');
const { registerSlashCommands } = require('../handlers/slashCommandHandler');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        try {
            logger.info(`Logged in as ${client.user.tag}`);
            client.user.setActivity('!help for commands', { type: 'WATCHING' });

            // Register slash commands
            await registerSlashCommands(client);
        } catch (error) {
            logger.error('Error in ready event:', error);
        }
    }
};