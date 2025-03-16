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
            }
        ];

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        logger.info('Started refreshing slash commands...');

        // Get all guilds the bot is in
        const guilds = await client.guilds.fetch();
        logger.info(`Bot is in ${guilds.size} guilds`);

        if (guilds.size > 0) {
            // Register commands for each guild
            for (const [guildId, guild] of guilds) {
                logger.info(`Registering commands for guild: ${guild.name} (${guildId})`);
                try {
                    await rest.put(
                        Routes.applicationGuildCommands(client.user.id, guildId),
                        { body: commands }
                    );
                    logger.info(`Successfully registered commands for guild: ${guild.name}`);
                } catch (error) {
                    logger.error(`Failed to register commands for guild ${guild.name}:`, error);
                }
            }
        } else {
            logger.warn('No guilds found, falling back to global command registration');
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commands }
            );
            logger.info('Successfully registered global commands');
        }
    } catch (error) {
        logger.error('Error registering slash commands:', error);
    }
}

module.exports = {
    registerSlashCommands
};