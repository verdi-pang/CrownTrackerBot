const { REST, Routes } = require('discord.js');
const logger = require('../utils/logger');

// This handler now only verifies commands, actual registration is done in index.js
async function verifySlashCommands(client) {
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        // Get current commands
        const registeredCommands = await rest.get(
            Routes.applicationCommands(client.user.id)
        );

        logger.info(`Verified slash commands: ${registeredCommands.map(cmd => cmd.name).join(', ')}`);
        return registeredCommands;
    } catch (error) {
        logger.error('Error verifying slash commands:', error);
        return [];
    }
}

module.exports = {
    verifySlashCommands
};