const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');
const logger = require('../../utils/logger');

const db = new sqlite3.Database('./monster_tracker.db', (err) => {
    if (err) {
        logger.error('Database connection error:', err);
        return;
    }
    logger.info('Connected to monster tracking database for missing command');
});

const MONSTER_API_URL = "https://mhw-db.com/monsters";

async function fetchAllMonsters() {
    try {
        logger.info('Fetching all monsters from API...');
        const response = await fetch(MONSTER_API_URL);
        if (!response.ok) {
            logger.error(`API returned status: ${response.status}`);
            return [];
        }
        const monsters = await response.json();
        logger.info(`Fetched ${monsters.length} monsters from API`);
        return monsters.map(monster => monster.name.toLowerCase());
    } catch (error) {
        logger.error('Error fetching monster list:', error);
        return [];
    }
}

module.exports = {
    name: 'missing',
    description: 'Show monsters you have not yet tracked',
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            logger.info(`Missing monsters command executed by user: ${userId}`);

            // Get all possible monsters
            const allMonsters = await fetchAllMonsters();
            if (allMonsters.length === 0) {
                logger.error('Failed to fetch monsters from API');
                await interaction.reply({
                    content: 'Could not fetch monster list. Please try again later.',
                    ephemeral: true
                });
                return;
            }

            // Get user's tracked monsters
            db.all(
                "SELECT DISTINCT LOWER(monster_name) as monster_name FROM encounters WHERE user_id = ?",
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

                        const trackedMonsters = rows.map(row => row.monster_name);
                        logger.info(`User ${userId} has tracked ${trackedMonsters.length} monsters: ${trackedMonsters.join(', ')}`);

                        const missingMonsters = allMonsters.filter(monster => 
                            !trackedMonsters.includes(monster.toLowerCase())
                        );
                        logger.info(`Found ${missingMonsters.length} missing monsters for user ${userId}`);

                        if (missingMonsters.length === 0) {
                            await interaction.reply({
                                content: '🎉 Congratulations! You have tracked all available monsters!',
                                ephemeral: true
                            });
                            return;
                        }

                        const progressPercentage = Math.round((trackedMonsters.length / allMonsters.length) * 100);
                        const missingList = missingMonsters
                            .map(monster => `❌ **${monster}**`)
                            .join('\n');

                        const embed = {
                            title: '🎯 Missing Monsters',
                            description: `You have tracked ${trackedMonsters.length}/${allMonsters.length} monsters (${progressPercentage}% complete)\n\nStill need to track:\n${missingList}`,
                            color: 0xff6b6b,
                            footer: {
                                text: `${missingMonsters.length} monsters remaining`
                            }
                        };

                        await interaction.reply({
                            embeds: [embed],
                            ephemeral: true
                        });
                        logger.info('Missing monsters command completed successfully');
                    } catch (error) {
                        logger.error('Error handling missing monsters response:', error);
                        if (!interaction.replied) {
                            await interaction.reply({
                                content: 'An error occurred while checking missing monsters.',
                                ephemeral: true
                            });
                        }
                    }
                }
            );
        } catch (error) {
            logger.error('Unhandled error in missing monsters command:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: 'An unexpected error occurred. Please try again later.',
                    ephemeral: true
                });
            }
        }
    }
};