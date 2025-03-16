const sqlite3 = require('sqlite3').verbose();
const logger = require('../../utils/logger');

const db = new sqlite3.Database('./monster_tracker.db');

module.exports = {
    name: 'progress',
    description: 'Check your logged monster encounters',
    execute(message, args) {
        try {
            const userId = message.author.id;
            
            db.all(
                "SELECT monster_name, size FROM encounters WHERE user_id = ?",
                [userId],
                (err, rows) => {
                    if (err) {
                        logger.error('Database query error:', err);
                        return message.reply('Error fetching progress.');
                    }
                    
                    if (!rows.length) {
                        return message.reply("You haven't logged any encounters yet.");
                    }

                    const progress = rows
                        .map(row => `🦖 **${row.monster_name}** (${row.size})`)
                        .join('\n');
                    
                    message.reply({
                        embeds: [{
                            title: '📊 Your Monster Tracking Progress',
                            description: progress,
                            color: 0x0099ff
                        }]
                    });
                }
            );
        } catch (error) {
            logger.error('Error in progress command:', error);
            message.reply('There was an error executing the progress command.');
        }
    }
};
