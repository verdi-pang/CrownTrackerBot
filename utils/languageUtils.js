const sqlite3 = require('sqlite3').verbose();
const logger = require('./logger');

// Database connection
const db = new sqlite3.Database('./monster_tracker.db', (err) => {
    if (err) {
        logger.error('Database connection error in languageUtils:', err);
        return;
    }
    logger.info('Connected to database for language utilities');
});

// Get user's language preference
async function getUserLanguage(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            "SELECT language FROM user_preferences WHERE user_id = ?",
            [userId],
            (err, row) => {
                if (err) {
                    logger.error(`Error getting language preference: ${err}`);
                    return reject(err);
                }
                
                // Default to English if no preference found
                const language = row ? row.language : 'en';
                logger.info(`Retrieved language for user ${userId}: ${language}`);
                resolve(language);
            }
        );
    });
}

// Get API URL based on user's language preference
async function getMonsterApiUrl(userId) {
    try {
        const language = await getUserLanguage(userId);
        const apiUrl = `https://wilds.mhdb.io/${language}/monsters?kind=large`;
        logger.info(`Using API URL for user ${userId}: ${apiUrl}`);
        return apiUrl;
    } catch (error) {
        logger.error(`Error getting API URL: ${error}`);
        // Default to English if there's an error
        return "https://wilds.mhdb.io/en/monsters?kind=large";
    }
}

// Language display names (for UI)
const LANGUAGE_DISPLAY = {
    'en': 'English',
    'zh-Hant': '正體中文'
};

module.exports = {
    getUserLanguage,
    getMonsterApiUrl,
    LANGUAGE_DISPLAY
};