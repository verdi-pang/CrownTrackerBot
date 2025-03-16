const logger = require('../utils/logger');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./monster_tracker.db');

module.exports = {
    name: 'messageCreate',
    execute(message, client) {
        try {
            // Only handle messages that need database access
            // Slash commands are handled in interactionCreate.js
            logger.info(`Message received from ${message.author.tag}`);
        } catch (error) {
            logger.error('Error handling message:', error);
        }
    }
};