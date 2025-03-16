const logger = require('../utils/logger');
const { registerSlashCommands } = require('../handlers/slashCommandHandler');
const sqlite3 = require('sqlite3').verbose();

// Ensure database table exists and verify connection
function initializeDatabase() {
    const db = new sqlite3.Database('./monster_tracker.db', (err) => {
        if (err) {
            logger.error('Database connection error:', err);
            return;
        }
        logger.info('Connected to database during initialization');

        // Verify database structure
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='encounters'", (err, row) => {
            if (err) {
                logger.error('Error checking table existence:', err);
                return;
            }

            if (!row) {
                logger.info('Creating encounters table...');
                // Create encounters table if it doesn't exist
                db.run(`
                    CREATE TABLE IF NOT EXISTS encounters (
                        user_id TEXT,
                        monster_name TEXT,
                        size TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (user_id, monster_name, size)
                    )
                `, (err) => {
                    if (err) {
                        logger.error('Error creating encounters table:', err);
                    } else {
                        logger.info('Encounters table initialized successfully');
                    }
                });
            } else {
                logger.info('Encounters table already exists');
                // Verify table structure
                db.all("PRAGMA table_info(encounters)", (err, columns) => {
                    if (err) {
                        logger.error('Error checking table structure:', err);
                    } else {
                        logger.info('Table structure:', columns);
                    }
                });
            }
        });
    });
}

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        try {
            logger.info(`Logged in as ${client.user.tag}`);
            logger.info(`Bot ID: ${client.user.id}`);
            client.user.setActivity('Use /track to log monsters', { type: 'PLAYING' });

            // Initialize and verify database
            initializeDatabase();

            // Register slash commands
            await registerSlashCommands(client);
        } catch (error) {
            logger.error('Error in ready event:', error);
        }
    }
};