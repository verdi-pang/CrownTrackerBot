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

        // Initialize database tables
        // First, check and create encounters table if needed
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
            
            // Next, check and create user_preferences table if needed
            db.run(`
                CREATE TABLE IF NOT EXISTS user_preferences (
                    user_id TEXT PRIMARY KEY,
                    language TEXT DEFAULT 'en',
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    logger.error('Error creating user_preferences table:', err);
                } else {
                    logger.info('User preferences table initialized successfully');
                }
                
                // Log table information
                db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
                    if (err) {
                        logger.error('Error checking database tables:', err);
                    } else {
                        logger.info('Database tables initialized:', tables.map(t => t.name).join(', '));
                    }
                });
            });
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