const logger = require('../utils/logger');
const sqlite3 = require('sqlite3').verbose();
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = new sqlite3.Database('./monster_tracker.db');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            logger.info(`Received interaction type: ${interaction.type}`);

            if (interaction.isChatInputCommand()) {
                const command = require(`../commands/monster/${interaction.commandName}.js`);
                if (command) {
                    await command.execute(interaction);
                }
            } else if (interaction.isStringSelectMenu()) {
                const userId = interaction.user.id;
                logger.info(`Select menu interaction from user ${userId}`);

                if (interaction.customId === 'select_monster') {
                    const selectedMonster = interaction.values[0];
                    logger.info(`Selected monster: ${selectedMonster}`);

                    // Get tracked sizes for this monster
                    db.all(
                        "SELECT size FROM encounters WHERE user_id = ? AND LOWER(monster_name) = LOWER(?)",
                        [userId, selectedMonster],
                        async (err, rows) => {
                            if (err) {
                                logger.error('Database query error:', err);
                                return interaction.reply({
                                    content: 'Error checking tracked sizes.',
                                    ephemeral: true
                                });
                            }

                            const trackedSizes = new Set(rows.map(row => row.size));

                            // Only show untracked sizes
                            const availableSizes = [
                                { label: 'Smallest', value: 'smallest', description: 'Record as smallest seen' },
                                { label: 'Largest', value: 'largest', description: 'Record as largest seen' }
                            ].filter(size => !trackedSizes.has(size.value));

                            if (availableSizes.length === 0) {
                                await interaction.reply({
                                    content: `You have already tracked both sizes for ${selectedMonster}!`,
                                    ephemeral: true
                                });
                                return;
                            }

                            const sizeMenu = new StringSelectMenuBuilder()
                                .setCustomId('select_size')
                                .setPlaceholder('Choose a size')
                                .addOptions(availableSizes);

                            const row = new ActionRowBuilder().addComponents(sizeMenu);

                            interaction.client.monsterSelections = interaction.client.monsterSelections || new Map();
                            interaction.client.monsterSelections.set(userId, selectedMonster);

                            await interaction.reply({
                                content: `Selected monster: **${selectedMonster}**\nChoose an available size:`,
                                components: [row],
                                ephemeral: true
                            });
                        }
                    );
                } else if (interaction.customId === 'select_size') {
                    const selectedMonster = interaction.client.monsterSelections?.get(userId);
                    if (!selectedMonster) {
                        return interaction.reply({
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
                                return interaction.reply({
                                    content: 'Error logging encounter.',
                                    ephemeral: true
                                });
                            }

                            interaction.client.monsterSelections.delete(userId);
                            await interaction.reply({
                                content: `Successfully logged **${size}** **${selectedMonster}** encounter!`,
                                ephemeral: true
                            });
                            logger.info(`Successfully logged encounter for user ${userId}`);
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