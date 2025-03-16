const logger = require('../utils/logger');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./monster_tracker.db');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            logger.info(`Received interaction type: ${interaction.type}`);

            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) return;

                await command.execute(interaction);
            } else if (interaction.isStringSelectMenu()) {
                const userId = interaction.user.id;
                logger.info(`Select menu interaction from user ${userId}`);

                if (interaction.customId === 'select_monster') {
                    const selectedMonster = interaction.values[0];
                    logger.info(`Selected monster: ${selectedMonster}`);

                    // Store the selection in a temporary way that works with Discord.js
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

                            // Clear the temporary selection
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