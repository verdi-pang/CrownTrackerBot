const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { getMonsterApiUrl } = require('../../utils/languageUtils');

// Database setup with proper error handling
const db = new sqlite3.Database('./monster_tracker.db', (err) => {
    if (err) {
        logger.error('Database connection error:', err);
        return;
    }
    logger.info('Connected to the monster tracking database.');

    // Create encounters table if it doesn't exist
    db.run(
        "CREATE TABLE IF NOT EXISTS encounters (user_id TEXT, monster_name TEXT, size TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, monster_name, size))"
    );
});

async function fetchMonsters(userId) {
    try {
        // Get API URL based on user's language preference
        const apiUrl = await getMonsterApiUrl(userId);
        logger.info(`Fetching monsters from API: ${apiUrl}`);
        
        const response = await fetch(apiUrl);

        if (!response.ok) {
            logger.error(`API response not OK: ${response.status} ${response.statusText}`);
            return [];
        }

        const monsters = await response.json();
        logger.info(`Raw API response received with ${monsters.length} monsters`);

        // Extract just the names from the monster data
        const monsterNames = monsters.map(monster => ({
            name: monster.name
        }));

        logger.info(`Processed ${monsterNames.length} monster names: ${JSON.stringify(monsterNames.slice(0, 3))}`);
        return monsterNames;
    } catch (error) {
        logger.error('Error fetching monster list:', error);
        return [];
    }
}

// Get user's already tracked monsters by size
async function getTrackedMonsters(userId) {
    return new Promise((resolve, reject) => {
        db.all(
            "SELECT monster_name, size FROM encounters WHERE user_id = ?",
            [userId],
            (err, rows) => {
                if (err) {
                    logger.error(`Database query error for tracked monsters: ${err}`);
                    return reject(err);
                }
                
                // Create sets for tracked monsters by size
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
                
                logger.info(`User ${userId} has tracked ${trackedSmallest.size} smallest and ${trackedLargest.size} largest monsters`);
                resolve({ trackedSmallest, trackedLargest });
            }
        );
    });
}

module.exports = {
    name: 'track',
    description: 'Track monster encounters and sizes',
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            logger.info(`User ${interaction.user.tag} (${userId}) initiated track command`);
            
            // Fetch all available monsters with user's language preference
            const monsters = await fetchMonsters(userId);
            if (monsters.length === 0) {
                return interaction.reply({
                    content: 'Could not fetch monster list. Please try again later.',
                    ephemeral: true
                });
            }
            
            // Get user's already tracked monsters
            const { trackedSmallest, trackedLargest } = await getTrackedMonsters(userId);

            // Display select menu with size selection first
            const sizeMenu = new StringSelectMenuBuilder()
                .setCustomId('select_size')
                .setPlaceholder('Choose a size to track')
                .addOptions([
                    { label: 'Smallest', value: 'smallest', description: 'Record as smallest seen' },
                    { label: 'Largest', value: 'largest', description: 'Record as largest seen' }
                ]);

            const row = new ActionRowBuilder().addComponents(sizeMenu);

            await interaction.reply({
                content: 'First, select which size you want to track:',
                components: [row],
                ephemeral: true
            });
            
            // We'll handle the monster selection after size is chosen in the interactionCreate.js file
            logger.info('Track command executed successfully - waiting for size selection');
        } catch (error) {
            logger.error('Error in track command:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: 'There was an error executing the track command.',
                    ephemeral: true
                });
            }
        }
    }
};