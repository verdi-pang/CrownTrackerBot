const sqlite3 = require('sqlite3').verbose();
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const logger = require('../../utils/logger');

// Database connection
const db = new sqlite3.Database('./monster_tracker.db', (err) => {
    if (err) {
        logger.error('Database connection error in language command:', err);
        return;
    }
    logger.info('Connected to database for language command');
});

// Available languages
const LANGUAGES = [
    { 
        label: 'English', 
        value: 'en', 
        description: 'Display monster names in English',
        emoji: '🇬🇧'
    },
    { 
        label: '正體中文', 
        value: 'zh-Hant', 
        description: 'Display monster names in Chinese',
        emoji: '🇨🇳'
    }
];

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
                resolve(row ? row.language : 'en');
            }
        );
    });
}

// Save user's language preference
async function saveUserLanguage(userId, language) {
    return new Promise((resolve, reject) => {
        // Use INSERT OR REPLACE to create or update
        db.run(
            "INSERT OR REPLACE INTO user_preferences (user_id, language, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
            [userId, language],
            (err) => {
                if (err) {
                    logger.error(`Error saving language preference: ${err}`);
                    return reject(err);
                }
                
                logger.info(`User ${userId} language set to ${language}`);
                resolve();
            }
        );
    });
}

module.exports = {
    name: 'language',
    description: 'Set your preferred language for monster names',
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            logger.info(`Language command executed by user: ${userId}`);
            logger.info(`Available languages: ${JSON.stringify(LANGUAGES)}`);
            
            // Get current language preference
            const currentLanguage = await getUserLanguage(userId);
            logger.info(`Current language for user ${userId}: ${currentLanguage}`);
            
            // If this is a menu selection response
            if (interaction.isStringSelectMenu()) {
                const selectedLanguage = interaction.values[0];
                
                // Save the preference
                await saveUserLanguage(userId, selectedLanguage);
                
                // Get the language display name
                const languageDisplay = LANGUAGES.find(lang => lang.value === selectedLanguage)?.label || selectedLanguage;
                
                await interaction.reply({
                    content: `✅ Your language preference has been set to **${languageDisplay}**. Monster names will now be displayed in your chosen language.`,
                    ephemeral: true
                });
                
                return;
            }
            
            // Create language selection menu
            const languageMenu = new StringSelectMenuBuilder()
                .setCustomId('select_language')
                .setPlaceholder('Choose your preferred language')
                .addOptions(LANGUAGES);
            
            const row = new ActionRowBuilder().addComponents(languageMenu);
            
            // Highlight the current language in the message
            const currentLangDisplay = LANGUAGES.find(lang => lang.value === currentLanguage)?.label || currentLanguage;
            
            await interaction.reply({
                content: `Select your preferred language for monster names.\nCurrent setting: **${currentLangDisplay}**`,
                components: [row],
                ephemeral: true
            });
            
            logger.info('Language selection menu sent');
        } catch (error) {
            logger.error('Error in language command:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: 'There was an error executing the language command.',
                    ephemeral: true
                });
            }
        }
    }
};