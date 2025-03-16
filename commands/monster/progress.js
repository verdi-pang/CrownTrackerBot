const sqlite3 = require('sqlite3').verbose();
const logger = require('../../utils/logger');

const db = new sqlite3.Database('./monster_tracker.db');

module.exports = {
    name: 'progress',
    description: 'Check your logged monster encounters',
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            logger.info(`Fetching progress for user: ${userId}`);

            db.all(
                "SELECT monster_name, size FROM encounters WHERE user_id = ?",
                [userId],
                async (err, rows) => {
                    if (err) {
                        logger.error('Database query error:', err);
                        return await interaction.reply({
                            content: 'Error fetching progress.',
                            ephemeral: true
                        });
                    }

                    if (!rows.length) {
                        return await interaction.reply({
                            content: "You haven't logged any encounters yet.",
                            ephemeral: true
                        });
                    }

                    const progress = rows
                        .map(row => `🦖 **${row.monster_name}** (${row.size})`)
                        .join('\n');

                    await interaction.reply({
                        embeds: [{
                            title: '📊 Your Monster Tracking Progress',
                            description: progress,
                            color: 0x0099ff
                        }],
                        ephemeral: true
                    });
                }
            );
        } catch (error) {
            logger.error('Error in progress command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'There was an error executing the progress command.',
                    ephemeral: true
                });
            }
        }
    }
};