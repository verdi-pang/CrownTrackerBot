const sqlite3 = require('sqlite3').verbose();
const logger = require('../../utils/logger');

// Database connection with proper error handling
const db = new sqlite3.Database('./monster_tracker.db', (err) => {
    if (err) {
        logger.error('Database connection error:', err);
        return;
    }
    logger.info('Connected to monster tracking database for progress command');
});

module.exports = {
    name: 'progress',
    description: 'Check your logged monster encounters',
    async execute(interaction) {
        try {
            const userId = interaction.user?.id;
            logger.info(`Progress command executed by user: ${userId}`);

            if (!userId) {
                logger.error('No user ID found in interaction');
                await interaction.reply({
                    content: 'Could not identify user. Please try again.',
                    ephemeral: true
                });
                return;
            }

            // Query encounters from database
            logger.info(`Attempting to query database for user ${userId}`);

            db.all(
                "SELECT monster_name, size FROM encounters WHERE user_id = ?",
                [userId],
                async (err, rows) => {
                    try {
                        if (err) {
                            logger.error(`Database query error for user ${userId}:`, err);
                            await interaction.reply({
                                content: 'Error fetching your progress. Please try again later.',
                                ephemeral: true
                            });
                            return;
                        }

                        logger.info(`Query completed. Found ${rows ? rows.length : 0} encounters`);

                        if (!rows || rows.length === 0) {
                            logger.info(`No encounters found for user ${userId}`);
                            await interaction.reply({
                                content: "You haven't logged any monster encounters yet. Use /track to start tracking!",
                                ephemeral: true
                            });
                            return;
                        }

                        logger.info(`Processing ${rows.length} encounters for user ${userId}`);
                        const progressList = rows
                            .map(row => `🦖 **${row.monster_name}** (${row.size})`)
                            .join('\n');

                        logger.info('Creating embed with progress data');
                        const embed = {
                            title: '📊 Your Monster Tracking Progress',
                            description: progressList,
                            color: 0x0099ff,
                            footer: {
                                text: `Total Encounters: ${rows.length}`
                            }
                        };

                        logger.info('Sending reply with progress embed');
                        await interaction.reply({
                            embeds: [embed],
                            ephemeral: true
                        });
                        logger.info('Progress command completed successfully');
                    } catch (error) {
                        logger.error('Error handling progress response:', error);
                        if (!interaction.replied) {
                            await interaction.reply({
                                content: 'An error occurred while displaying your progress.',
                                ephemeral: true
                            });
                        }
                    }
                }
            );
        } catch (error) {
            logger.error('Unhandled error in progress command:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: 'An unexpected error occurred. Please try again later.',
                    ephemeral: true
                });
            }
        }
    }
};
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'progress',
    data: new SlashCommandBuilder()
        .setName('progress')
        .setDescription('Check your logged encounters'),
    async execute(interaction) {
        await interaction.reply('Showing progress...');
    }
};
