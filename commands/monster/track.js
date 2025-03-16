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
        const response = await fetch(MONSTER_API_URL);
        const data = await response.json();
        return data.monsters || [];
    } catch (error) {
        logger.error('Error fetching monster list:', error);
        return [];
    }
}

module.exports = {
    name: 'track',
    description: 'Track monster encounters and sizes',
    async execute(message, args) {
        try {
            const monsters = await fetchMonsters();
            if (monsters.length === 0) {
                return message.reply('Could not fetch monster list.');
            }

            const monsterMenu = new StringSelectMenuBuilder()
                .setCustomId('select_monster')
                .setPlaceholder('Choose a monster')
                .addOptions(
                    monsters.map(monster => ({
                        label: monster.name,
                        value: monster.name.toLowerCase()
                    }))
                );

            const sizeMenu = new StringSelectMenuBuilder()
                .setCustomId('select_size')
                .setPlaceholder('Choose a size')
                .addOptions([
                    { label: 'Smallest', value: 'smallest' },
                    { label: 'Largest', value: 'largest' }
                ]);

            const row1 = new ActionRowBuilder().addComponents(monsterMenu);
            const row2 = new ActionRowBuilder().addComponents(sizeMenu);

            await message.reply({
                content: 'Select a monster and size:',
                components: [row1, row2]
            });
        } catch (error) {
            logger.error('Error in track command:', error);
            message.reply('There was an error executing the track command.');
        }
    }
};
