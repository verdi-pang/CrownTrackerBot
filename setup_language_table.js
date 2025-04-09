const sqlite3 = require('sqlite3').verbose();
const logger = require('./utils/logger');

// Open database connection
const db = new sqlite3.Database('./monster_tracker.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
    logger.info('Connected to the database to set up language table');
});

// Create user_preferences table if it doesn't exist
db.run(`
    CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        language TEXT DEFAULT 'en',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) {
        logger.error('Error creating user preferences table:', err);
        db.close();
        process.exit(1);
    }
    
    logger.info('User preferences table created successfully');
    
    // Close the database connection
    db.close((err) => {
        if (err) {
            logger.error('Error closing database:', err);
            process.exit(1);
        }
        logger.info('Database connection closed');
    });
});