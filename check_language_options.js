const sqlite3 = require('sqlite3').verbose();

// Connect to the database
const db = new sqlite3.Database('./monster_tracker.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
    console.log('Connected to database to check language options');
});

// Get all unique language values from the database
db.all("SELECT DISTINCT language FROM user_preferences", (err, rows) => {
    if (err) {
        console.error('Error querying user preferences:', err);
        db.close();
        process.exit(1);
    }
    
    console.log('\nLanguages currently used in the database:');
    console.log('---------------------------------------');
    if (rows.length === 0) {
        console.log('No language preferences found in the database.');
    } else {
        rows.forEach(row => {
            console.log(`- ${row.language}`);
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