const sqlite3 = require('sqlite3').verbose();

// Connect to the database
const db = new sqlite3.Database('./monster_tracker.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to the monster_tracker database');
    
    // Check if encounters table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='encounters'", (err, row) => {
        if (err) {
            console.error('Error checking table:', err);
            db.close();
            return;
        }
        
        if (!row) {
            console.log('Encounters table does not exist yet');
            db.close();
            return;
        }
        
        // Query all records
        db.all("SELECT * FROM encounters", (err, rows) => {
            if (err) {
                console.error('Error querying table:', err);
                db.close();
                return;
            }
            
            if (rows.length === 0) {
                console.log('Database is empty - no encounters have been tracked');
            } else {
                console.log(`Found ${rows.length} encounters in the database:`);
                rows.forEach(row => {
                    console.log(`- User ${row.user_id} tracked ${row.monster_name} (${row.size})`);
                });
            }
            
            // Close the database connection
            db.close();
        });
    });
});