const logger = require('./logger');
const sqlite3 = require('sqlite3').verbose();

// Simple database adapter that works with SQLite now
// but can be extended to support PostgreSQL for Railway deployment
class DatabaseAdapter {
  constructor() {
    // For now, just use SQLite
    this.db = new sqlite3.Database('./monster_tracker.db');
    
    // When you migrate to Railway, you'll update this to use PostgreSQL
    // based on environment variables provided by Railway
    
    logger.info('Database adapter initialized');
  }
  
  // Run a query and return a Promise
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          logger.error('Database run error:', err);
          return reject(err);
        }
        resolve(this); // 'this' contains lastID, changes, etc.
      });
    });
  }
  
  // Get a single row
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error('Database get error:', err);
          return reject(err);
        }
        resolve(row);
      });
    });
  }
  
  // Get multiple rows
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error('Database all error:', err);
          return reject(err);
        }
        resolve(rows);
      });
    });
  }
  
  // Close the database connection
  close() {
    return new Promise((resolve, reject) => {
      this.db.close(err => {
        if (err) {
          logger.error('Error closing database:', err);
          return reject(err);
        }
        resolve();
      });
    });
  }
  
  // Initialize tables
  async initTables() {
    // Create encounters table if it doesn't exist
    await this.run(`
      CREATE TABLE IF NOT EXISTS encounters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        monster_name TEXT NOT NULL,
        size TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, monster_name, size)
      )
    `);
    
    // Create user preferences table if it doesn't exist
    await this.run(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        language TEXT NOT NULL DEFAULT 'en',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    logger.info('Database tables initialized');
  }
}

// Export a singleton instance
const dbAdapter = new DatabaseAdapter();
module.exports = dbAdapter;