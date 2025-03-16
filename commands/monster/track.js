const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const logger = require('../../utils/logger');

// Database setup
const db = new sqlite3.Database('./monster_tracker.db', (err) => {
    if (err) {
        logger.error('Database connection error:', err);
        return;
    }
    logger.info('Connected to the monster tracking database.');

    // Create encounters table if it doesn't exist
    db.run(
        "CREATE TABLE IF NOT EXISTS encounters (user_id TEXT, monster_name TEXT, size TEXT, PRIMARY KEY (user_id, monster_name, size))"
    );
});

// API URL for monster data
const MONSTER_API_URL = "https://mhw-db.com/monsters";

async function fetchMonsters() {
    try {
        logger.info(`Starting monster fetch from ${MONSTER_API_URL}`);
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

        logger.info(`Processed monster names (first 3): ${JSON.stringify(monsterNames.slice(0, 3))}`);
        return monsterNames;
    } catch (error) {
        logger.error('Error fetching monster list:', error);
        logger.error('Error details:', error.message);
        return [];
    }
}

module.exports = {
    name: 'track',
    description: 'Track monster encounters and sizes',
    async execute(message, args) {
        try {
            logger.info(`User ${message.author.tag} initiated track command with prefix: ${process.env.PREFIX}`);
            const monsters = await fetchMonsters();

            if (monsters.length === 0) {
                logger.error('No monsters fetched from API');
                return message.reply('Could not fetch monster list. Please try again later.');
            }

            logger.info(`Creating dropdown menu with ${monsters.length} monsters`);

            const monsterMenu = new StringSelectMenuBuilder()
                .setCustomId('select_monster')
                .setPlaceholder('Choose a monster')
                .addOptions(
                    monsters.map(monster => ({
                        label: monster.name,
                        value: monster.name.toLowerCase()
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

            await message.reply({
                content: 'Select a monster and size:',
                components: [row1, row2]
            });

            logger.info('Track command executed successfully');
        } catch (error) {
            logger.error('Error in track command:', error);
            logger.error('Error details:', error.message);
            message.reply('There was an error executing the track command.');
        }
    }
};