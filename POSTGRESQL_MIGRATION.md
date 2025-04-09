# PostgreSQL Migration Guide

This guide explains how to migrate your bot from SQLite to PostgreSQL when deploying to Railway.

## Step 1: Add PostgreSQL Package

```bash
npm install pg
```

## Step 2: Create a New Database Adapter

Create a file called `utils/pgAdapter.js`:

```javascript
const { Pool } = require('pg');
const logger = require('./logger');

class PostgreSQLAdapter {
  constructor() {
    // Connection pool using Railway environment variables
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Required for Railway PostgreSQL
      }
    });
    
    logger.info('PostgreSQL adapter initialized');
  }
  
  // Run a query and return a Promise
  async run(sql, params = []) {
    // Convert SQLite's placeholders (?) to PostgreSQL's placeholders ($1, $2, etc)
    const pgSql = sql.replace(/\?/g, (_, i) => `$${i + 1}`);
    
    const client = await this.pool.connect();
    try {
      const result = await client.query(pgSql, params);
      return result;
    } finally {
      client.release();
    }
  }
  
  // Get a single row
  async get(sql, params = []) {
    // Convert SQLite's placeholders (?) to PostgreSQL's placeholders ($1, $2, etc)
    const pgSql = sql.replace(/\?/g, (_, i) => `$${i + 1}`);
    
    const client = await this.pool.connect();
    try {
      const result = await client.query(pgSql, params);
      return result.rows[0];
    } finally {
      client.release();
    }
  }
  
  // Get multiple rows
  async all(sql, params = []) {
    // Convert SQLite's placeholders (?) to PostgreSQL's placeholders ($1, $2, etc)
    const pgSql = sql.replace(/\?/g, (_, i) => `$${i + 1}`);
    
    const client = await this.pool.connect();
    try {
      const result = await client.query(pgSql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }
  
  // Close all connections
  async close() {
    await this.pool.end();
  }
  
  // Initialize tables
  async initTables() {
    // For PostgreSQL, adjust the SQL syntax appropriately
    await this.run(`
      CREATE TABLE IF NOT EXISTS encounters (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        monster_name TEXT NOT NULL,
        size TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, monster_name, size)
      )
    `);
    
    await this.run(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        language TEXT NOT NULL DEFAULT 'en',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    logger.info('PostgreSQL tables initialized');
  }
}

// Create and export an instance
const pgAdapter = new PostgreSQLAdapter();
module.exports = pgAdapter;
```

## Step 3: Update Database Imports

In your code, create a factory pattern to use the right adapter:

```javascript
// In utils/db.js
const logger = require('./logger');

// The factory function decides which database adapter to use
function getDatabaseAdapter() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
    logger.info('Using PostgreSQL adapter');
    return require('./pgAdapter');
  } else {
    logger.info('Using SQLite adapter');
    return require('./dbAdapter');
  }
}

module.exports = getDatabaseAdapter();
```

## Step 4: Data Migration

To migrate data from SQLite to PostgreSQL:

1. Export data from SQLite:
```javascript
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./monster_tracker.db');

// Export encounters
db.all('SELECT * FROM encounters', [], (err, rows) => {
  if (err) throw err;
  fs.writeFileSync('./encounters_export.json', JSON.stringify(rows));
  console.log(`Exported ${rows.length} encounters`);
});

// Export user preferences
db.all('SELECT * FROM user_preferences', [], (err, rows) => {
  if (err) throw err;
  fs.writeFileSync('./preferences_export.json', JSON.stringify(rows));
  console.log(`Exported ${rows.length} user preferences`);
});
```

2. Import data to PostgreSQL:
```javascript
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function importData() {
  // Import encounters
  const encounters = JSON.parse(fs.readFileSync('./encounters_export.json'));
  
  for (const encounter of encounters) {
    await pool.query(
      'INSERT INTO encounters(user_id, monster_name, size, created_at) VALUES($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [encounter.user_id, encounter.monster_name, encounter.size, encounter.created_at]
    );
  }
  
  // Import user preferences
  const preferences = JSON.parse(fs.readFileSync('./preferences_export.json'));
  
  for (const pref of preferences) {
    await pool.query(
      'INSERT INTO user_preferences(user_id, language, updated_at) VALUES($1, $2, $3) ON CONFLICT DO NOTHING',
      [pref.user_id, pref.language, pref.updated_at]
    );
  }
  
  console.log('Data import complete');
}

importData().catch(console.error);
```

## Step 5: Testing

1. Test locally using a PostgreSQL docker container
2. Verify all functionality works with the new database
3. Deploy to Railway