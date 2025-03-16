const logger = require('../utils/logger');
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
                db.run(`
                    CREATE TABLE IF NOT EXISTS encounters (
                        user_id TEXT,
                        monster_name TEXT,
                        size TEXT,
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
            logger.info(`Bot ID: ${client.user.id}`);
            // Initialize and verify database
            initializeDatabase();
        } catch (error) {
            logger.error('Error in ready event:', error);
        }
    }
};