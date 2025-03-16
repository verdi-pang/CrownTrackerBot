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

    // Create encounters table if it doesn't exist
    db.run(
        "CREATE TABLE IF NOT EXISTS encounters (user_id TEXT, monster_name TEXT, size TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, monster_name, size))"
    );
});

// API URL for monster data
const MONSTER_API_URL = "https://mhw-db.com/monsters";

async function fetchMonsters() {
    try {
        logger.info('Fetching monsters from API...');
        const response = await fetch(MONSTER_API_URL);

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

module.exports = {
    name: 'track',
    description: 'Track monster encounters and sizes',
    async execute(interaction) {
        try {
            logger.info(`User ${interaction.user.tag} initiated track command`);
            const monsters = await fetchMonsters();

            if (monsters.length === 0) {
                return interaction.reply({
                    content: 'Could not fetch monster list. Please try again later.',
                    ephemeral: true
                });
            }

            const monsterMenu = new StringSelectMenuBuilder()
                .setCustomId('select_monster')
                .setPlaceholder('Choose a monster')
                .addOptions(
                    monsters.map(monster => ({
                        label: monster.name,
                        value: monster.name.toLowerCase(),
                        description: `Track ${monster.name}`
                    })).slice(0, 25)
                );

            const sizeMenu = new StringSelectMenuBuilder()
                .setCustomId('select_size')
                .setPlaceholder('Choose a size')
                .addOptions([
                    { label: 'Smallest', value: 'smallest', description: 'Record as smallest seen' },
                    { label: 'Largest', value: 'largest', description: 'Record as largest seen' }
                ]);

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
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'track',
    data: new SlashCommandBuilder()
        .setName('track')
        .setDescription('Track a monster encounter'),
    async execute(interaction) {
        await interaction.reply('Monster tracking started!');
    }
};
