const logger = require('../utils/logger');
const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = new sqlite3.Database('./monster_tracker.db');

const MONSTER_API_URL = "https://mhw-db.com/monsters";

async function fetchMonsters() {
    try {
        logger.info('Fetching monsters from API...');
        const response = await fetch(MONSTER_API_URL);
        const monsters = await response.json();
        return monsters.map(monster => ({
            name: monster.name
        }));
    } catch (error) {
        logger.error('Error fetching monster list:', error);
        return [];
    }
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            logger.info(`Received interaction type: ${interaction.type} from user ${interaction.user.tag}`);

            if (interaction.isChatInputCommand()) {
                if (interaction.commandName === 'track') {
                    const monsters = await fetchMonsters();
                    if (monsters.length === 0) {
                        return await interaction.reply({
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

                    await interaction.reply({
                        content: 'Select a monster and size:',
                        components: [row1, row2],
                        ephemeral: true
                    });
                } else if (interaction.commandName === 'progress') {
                    // Get the progress command and execute it
                    const command = client.commands.get('progress');
                    if (!command) return;
                    await command.execute(interaction);
                } else {
                    const command = client.commands.get(interaction.commandName);
                    if (!command) return;

                    await command.execute(interaction);
                }
            } else if (interaction.isStringSelectMenu()) {
                const userId = interaction.user.id;
                logger.info(`Select menu interaction from user ${userId}`);

                if (interaction.customId === 'select_monster') {
                    const selectedMonster = interaction.values[0];
                    logger.info(`Selected monster: ${selectedMonster}`);

                    interaction.client.monsterSelections = interaction.client.monsterSelections || new Map();
                    interaction.client.monsterSelections.set(userId, selectedMonster);

                    await interaction.reply({
                        content: `Selected monster: **${selectedMonster}**. Now choose a size!`,
                        ephemeral: true
                    });
                }

                if (interaction.customId === 'select_size') {
                    const selectedMonster = interaction.client.monsterSelections?.get(userId);
                    if (!selectedMonster) {
                        return await interaction.reply({
                            content: 'Please select a monster first!',
                            ephemeral: true
                        });
                    }

                    const size = interaction.values[0];
                    logger.info(`Logging ${size} ${selectedMonster} for user ${userId}`);

                    db.run(
                        "INSERT OR IGNORE INTO encounters (user_id, monster_name, size) VALUES (?, ?, ?)",
                        [userId, selectedMonster, size],
                        async (err) => {
                            if (err) {
                                logger.error('Database insert error:', err);
                                return await interaction.reply({
                                    content: 'Error logging encounter.',
                                    ephemeral: true
                                });
                            }

                            interaction.client.monsterSelections.delete(userId);
                            await interaction.reply({
                                content: `Successfully logged **${size}** **${selectedMonster}** encounter!`,
                                ephemeral: true
                            });
                        }
                    );
                }
            }
        } catch (error) {
            logger.error('Error handling interaction:', error);
            try {
                const reply = {
                    content: 'There was an error while executing this command!',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            } catch (e) {
                logger.error('Error sending error message:', e);
            }
        }
    }
};