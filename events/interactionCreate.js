const logger = require('../utils/logger');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./monster_tracker.db');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) return;

                await command.execute(interaction);
            } else if (interaction.isStringSelectMenu()) {
                const userId = interaction.user.id;

                if (interaction.customId === 'select_monster') {
                    interaction.message.monsterSelection = interaction.values[0];
                    await interaction.reply({
                        content: `Selected monster: **${interaction.values[0]}**. Now choose a size!`,
                        ephemeral: true
                    });
                }

                if (interaction.customId === 'select_size') {
                    if (!interaction.message.monsterSelection) {
                        return interaction.reply({
                            content: 'Please select a monster first!',
                            ephemeral: true
                        });
                    }

                    const monster = interaction.message.monsterSelection;
                    const size = interaction.values[0];

                    db.run(
                        "INSERT OR IGNORE INTO encounters (user_id, monster_name, size) VALUES (?, ?, ?)",
                        [userId, monster, size],
                        async (err) => {
                            if (err) {
                                logger.error('Database insert error:', err);
                                return interaction.reply('Error logging encounter.');
                            }
                            await interaction.reply(`Logged **${size}** **${monster}** encounter!`);
                        }
                    );
                }
            }
        } catch (error) {
            logger.error('Error handling interaction:', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ 
                    content: 'There was an error while executing this command!',
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: 'There was an error while executing this command!',
                    ephemeral: true 
                });
            }
        }
    }
};
