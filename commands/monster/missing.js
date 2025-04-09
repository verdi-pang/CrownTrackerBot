const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');
const logger = require('../../utils/logger');
const { getMonsterApiUrl } = require('../../utils/languageUtils');

// Database setup with proper error handling
const db = new sqlite3.Database('./monster_tracker.db', (err) => {
    if (err) {
        logger.error('Database connection error:', err);
        return;
    }
    logger.info('Connected to monster tracking database for missing command');
});

async function fetchAllMonsters(userId) {
    try {
        // Get API URL based on user's language preference
        const apiUrl = await getMonsterApiUrl(userId);
        logger.info(`Fetching all monsters from API: ${apiUrl}`);
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            logger.error(`API response not OK: ${response.status} ${response.statusText}`);
            return [];
        }

        const monsters = await response.json();
        logger.info(`Raw API response received with ${monsters.length} monsters`);

        // Extract just the names from the monster data
        const monsterNames = monsters.map(monster => monster.name.toLowerCase());

        logger.info(`Processed ${monsterNames.length} monster names: ${JSON.stringify(monsterNames.slice(0, 3))}`);
        return monsterNames;
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
            const userId = interaction.user?.id;
            logger.info(`Missing monsters command executed by user: ${userId}`);

            if (!userId) {
                logger.error('No user ID found in interaction');
                await interaction.reply({
                    content: 'Could not identify user. Please try again.',
                    ephemeral: true
                });
                return;
            }

            // Get all possible monsters with user's language preference
            const allMonsters = await fetchAllMonsters(userId);
            if (allMonsters.length === 0) {
                logger.error('Failed to fetch monsters from API');
                await interaction.reply({
                    content: 'Could not fetch monster list. Please try again later.',
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

                        // Create maps for tracked monsters by size
                        const trackedSmallest = new Set(
                            rows
                                .filter(row => row.size === 'smallest')
                                .map(row => row.monster_name.toLowerCase())
                        );
                        const trackedLargest = new Set(
                            rows
                                .filter(row => row.size === 'largest')
                                .map(row => row.monster_name.toLowerCase())
                        );

                        // Find missing monsters for each size
                        const missingSmallest = allMonsters.filter(monster => 
                            !trackedSmallest.has(monster)
                        );
                        const missingLargest = allMonsters.filter(monster => 
                            !trackedLargest.has(monster)
                        );

                        logger.info(`Found ${missingSmallest.length} missing smallest and ${missingLargest.length} missing largest monsters`);

                        if (missingSmallest.length === 0 && missingLargest.length === 0) {
                            await interaction.reply({
                                content: '🎉 Congratulations! You have tracked all monsters in both size categories!',
                                ephemeral: true
                            });
                            return;
                        }

                        // Calculate progress percentages
                        const smallestProgress = Math.round(((allMonsters.length - missingSmallest.length) / allMonsters.length) * 100);
                        const largestProgress = Math.round(((allMonsters.length - missingLargest.length) / allMonsters.length) * 100);

                        // Create separate lists for missing monsters by size
                        const smallestList = missingSmallest
                            .map(monster => `❌ **${monster}**`)
                            .join('\n');
                        const largestList = missingLargest
                            .map(monster => `❌ **${monster}**`)
                            .join('\n');

                        const embed = {
                            title: '🎯 Missing Monsters',
                            description: 'Your monster tracking progress by size:',
                            fields: [
                                {
                                    name: `📏 Smallest Monsters (${smallestProgress}% complete)`,
                                    value: smallestList || 'All smallest sizes tracked! 🎉',
                                    inline: false
                                },
                                {
                                    name: `📐 Largest Monsters (${largestProgress}% complete)`,
                                    value: largestList || 'All largest sizes tracked! 🎉',
                                    inline: false
                                }
                            ],
                            color: 0xff6b6b,
                            footer: {
                                text: `Missing: ${missingSmallest.length} smallest, ${missingLargest.length} largest`
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