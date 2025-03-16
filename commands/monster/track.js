const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const logger = require('../../utils/logger');

// Database setup with proper error handling
const db = new sqlite3.Database('./monster_tracker.db', (err) => {
    if (err) {
        logger.error('Database connection error:', err);
        return;
    }
    logger.info('Connected to the monster tracking database.');
});

// API URL for monster data - updated to query only large monsters
const MONSTER_API_URL = "https://mhw-db.com/monsters?type=large";

async function getTrackedMonsters(userId) {
    return new Promise((resolve, reject) => {
        db.all(
            "SELECT monster_name, size FROM encounters WHERE user_id = ?",
            [userId],
            (err, rows) => {
                if (err) {
                    logger.error('Error fetching tracked monsters:', err);
                    reject(err);
                    return;
                }
                resolve(rows || []);
            }
        );
    });
}

async function fetchMonsters() {
    try {
        logger.info('Fetching large monsters from API...');
        const response = await fetch(MONSTER_API_URL);

        if (!response.ok) {
            logger.error(`API response not OK: ${response.status} ${response.statusText}`);
            return [];
        }

        const monsters = await response.json();
        logger.info(`Raw API response received with ${monsters.length} large monsters`);

        const monsterNames = monsters.map(monster => ({
            name: monster.name
        }));

        logger.info(`Processed ${monsterNames.length} large monster names`);
        return monsterNames;
    } catch (error) {
        logger.error('Error fetching monster list:', error);
        return [];
    }
}

module.exports = {
    name: 'track',
    description: 'Track monster encounters and sizes',
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            logger.info(`User ${interaction.user.tag} initiated track command`);

            // Get all monsters from API
            const monsters = await fetchMonsters();
            if (monsters.length === 0) {
                return interaction.reply({
                    content: 'Could not fetch monster list. Please try again later.',
                    ephemeral: true
                });
            }

            // Get user's tracked monsters
            const trackedMonsters = await getTrackedMonsters(userId);

            // Create sets for tracked monsters by size
            const trackedSmallest = new Set(
                trackedMonsters
                    .filter(row => row.size === 'smallest')
                    .map(row => row.monster_name.toLowerCase())
            );
            const trackedLargest = new Set(
                trackedMonsters
                    .filter(row => row.size === 'largest')
                    .map(row => row.monster_name.toLowerCase())
            );

            // Filter available monsters based on what's left to track
            const availableMonsters = monsters.filter(monster => {
                const monsterName = monster.name.toLowerCase();
                return !trackedSmallest.has(monsterName) || !trackedLargest.has(monsterName);
            });

            if (availableMonsters.length === 0) {
                return interaction.reply({
                    content: '🎉 Congratulations! You have tracked all monsters in both size categories!',
                    ephemeral: true
                });
            }

            const monsterMenu = new StringSelectMenuBuilder()
                .setCustomId('select_monster')
                .setPlaceholder('Choose a monster')
                .addOptions(
                    availableMonsters.map(monster => ({
                        label: monster.name,
                        value: monster.name.toLowerCase(),
                        description: `Track ${monster.name}`
                    })).slice(0, 25)
                );

            // Only show size options that haven't been tracked for the selected monster
            const sizeMenu = new StringSelectMenuBuilder()
                .setCustomId('select_size')
                .setPlaceholder('Choose a size')
                .addOptions(
                    [
                        { label: 'Smallest', value: 'smallest', description: 'Record as smallest seen' },
                        { label: 'Largest', value: 'largest', description: 'Record as largest seen' }
                    ]
                );

            const row1 = new ActionRowBuilder().addComponents(monsterMenu);
            const row2 = new ActionRowBuilder().addComponents(sizeMenu);

            await interaction.reply({
                content: 'Select a monster and size to track:',
                components: [row1, row2],
                ephemeral: true
            });

            logger.info('Track command executed successfully');
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