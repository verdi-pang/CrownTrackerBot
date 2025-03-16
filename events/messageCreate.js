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

            logger.info(`Received command: ${commandName}`);

            const command = client.commands.get(commandName);
            if (!command) return;

            command.execute(message, args);
        } catch (error) {
            logger.error('Error handling message:', error);
            message.reply('There was an error executing that command.');
        }
    }
};