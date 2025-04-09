const sqlite3 = require('sqlite3').verbose();
const logger = require('./utils/logger');

// Database connection
const db = new sqlite3.Database('./monster_tracker.db', (err) => {
    if (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
    console.log('Connected to database for inspection');
});

// Get list of tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.error('Error getting tables:', err);
        process.exit(1);
    }
    
    console.log('\nDatabase Tables:');
    console.log('----------------');
    tables.forEach(table => {
        console.log(table.name);
    });
    
    // Check user_preferences table structure
    db.all("PRAGMA table_info(user_preferences)", (err, columns) => {
        if (err) {
            console.error('Error getting user_preferences columns:', err);
        } else {
            console.log('\nUser Preferences Table Structure:');
            console.log('-------------------------------');
            columns.forEach(col => {
                console.log(`${col.name}: ${col.type} ${col.dflt_value ? '(Default: ' + col.dflt_value + ')' : ''}`);
            });
        }
        
        // Check encounters table structure
        db.all("PRAGMA table_info(encounters)", (err, columns) => {
            if (err) {
                console.error('Error getting encounters columns:', err);
            } else {
                console.log('\nEncounters Table Structure:');
                console.log('--------------------------');
                columns.forEach(col => {
                    console.log(`${col.name}: ${col.type} ${col.dflt_value ? '(Default: ' + col.dflt_value + ')' : ''}`);
                });
            }
            
            // Close the database connection
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('\nDatabase connection closed');
                }
            });
        });
    });
});