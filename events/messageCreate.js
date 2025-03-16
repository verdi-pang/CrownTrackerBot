const logger = require('../utils/logger');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./monster_tracker.db');

module.exports = {
    name: 'messageCreate',
    execute(message, client) {
        try {
            const prefix = process.env.PREFIX || '!';

            if (!message.content.startsWith(prefix) || message.author.bot) return;

            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            const command = client.commands.get(commandName);
            if (!command) return;

            // Handle monster selection from menus
            if (message.isStringSelectMenu()) {
                const userId = message.user.id;

                if (message.customId === 'select_monster') {
                    message.message.monsterSelection = message.values[0];
                    message.reply({
                        content: `Selected monster: **${message.values[0]}**. Now choose a size!`,
                        ephemeral: true
                    });
                }

                if (message.customId === 'select_size') {
                    if (!message.message.monsterSelection) {
                        return message.reply({
                            content: 'Please select a monster first!',
                            ephemeral: true
                        });
                    }

                    const monster = message.message.monsterSelection;
                    const size = message.values[0];

                    db.run(
                        "INSERT OR IGNORE INTO encounters (user_id, monster_name, size) VALUES (?, ?, ?)",
                        [userId, monster, size],
                        (err) => {
                            if (err) {
                                logger.error('Database insert error:', err);
                                return message.reply('Error logging encounter.');
                            }
                            message.reply(`Logged **${size}** **${monster}** encounter!`);
                        }
                    );
                }
            }

            command.execute(message, args);
        } catch (error) {
            logger.error('Error handling message:', error);
            message.reply('There was an error executing that command.');
        }
    }
};