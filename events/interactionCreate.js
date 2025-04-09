const logger = require('../utils/logger');
const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = new sqlite3.Database('./monster_tracker.db');

// Updated API URL with Chinese language
const MONSTER_API_URL = "https://wilds.mhdb.io/zh-Hant/monsters?kind=large";

async function fetchMonsters() {
    try {
        logger.info('Fetching monsters from API...');
        const response = await fetch(MONSTER_API_URL);
        
        if (!response.ok) {
            logger.error(`API response not OK: ${response.status} ${response.statusText}`);
            return [];
        }
        
        const monsters = await response.json();
        return monsters.map(monster => ({
            name: monster.name
        }));
    } catch (error) {
        logger.error('Error fetching monster list:', error);
        return [];
    }
}

// Get user's already tracked monsters by size
async function getTrackedMonsters(userId) {
    return new Promise((resolve, reject) => {
        db.all(
            "SELECT monster_name, size FROM encounters WHERE user_id = ?",
            [userId],
            (err, rows) => {
                if (err) {
                    logger.error(`Database query error for tracked monsters: ${err}`);
                    return reject(err);
                }
                
                // Create sets for tracked monsters by size
                const trackedSmallest = new Set(
                    rows
                        .filter(row => row.size === 'smallest')
                        .map(row => row.monster_name.toLowerCase())
                );
                const trackedLargest = new Set(
                    rows
                        .filter(row => row.size === 'largest')
                        .map(row => row.monster_name.toLowerCase())
                );
                
                logger.info(`User ${userId} has tracked ${trackedSmallest.size} smallest and ${trackedLargest.size} largest monsters`);
                resolve({ trackedSmallest, trackedLargest });
            }
        );
    });
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            logger.info(`Received interaction type: ${interaction.type}`);

            if (interaction.isChatInputCommand()) {
                logger.info(`Processing command: ${interaction.commandName}`);

                if (interaction.commandName === 'track') {
                    try {
                        const trackCommand = require('../commands/monster/track');
                        await trackCommand.execute(interaction);
                        logger.info('Track command executed successfully');
                    } catch (error) {
                        logger.error('Error executing track command:', error);
                        if (!interaction.replied) {
                            await interaction.reply({
                                content: 'There was an error executing the track command.',
                                ephemeral: true
                            });
                        }
                    }
                } else if (interaction.commandName === 'progress') {
                    logger.info(`Progress command received from user ${interaction.user.id}`);
                    try {
                        const progressCommand = require('../commands/monster/progress');
                        await progressCommand.execute(interaction);
                        logger.info('Progress command executed successfully');
                    } catch (error) {
                        logger.error('Error executing progress command:', error);
                        if (!interaction.replied) {
                            await interaction.reply({
                                content: 'There was an error executing the progress command.',
                                ephemeral: true
                            });
                        }
                    }
                } else if (interaction.commandName === 'missing') {
                    logger.info(`Missing monsters command received from user ${interaction.user.id}`);
                    try {
                        const missingCommand = require('../commands/monster/missing');
                        await missingCommand.execute(interaction);
                        logger.info('Missing monsters command executed successfully');
                    } catch (error) {
                        logger.error('Error executing missing monsters command:', error);
                        if (!interaction.replied) {
                            await interaction.reply({
                                content: 'There was an error executing the missing monsters command.',
                                ephemeral: true
                            });
                        }
                    }
                }
            } else if (interaction.isStringSelectMenu()) {
                const userId = interaction.user.id;
                logger.info(`Select menu interaction from user ${userId}: ${interaction.customId}`);

                // Store user session data if not already initialized
                client.userSessions = client.userSessions || new Map();
                let userSession = client.userSessions.get(userId) || {};
                
                if (interaction.customId === 'select_size') {
                    const selectedSize = interaction.values[0];
                    logger.info(`User ${userId} selected size: ${selectedSize}`);
                    
                    // Store the selected size
                    userSession.selectedSize = selectedSize;
                    client.userSessions.set(userId, userSession);
                    
                    // Get user's already tracked monsters
                    const { trackedSmallest, trackedLargest } = await getTrackedMonsters(userId);
                    
                    // Fetch all available monsters
                    const monsters = await fetchMonsters();
                    if (monsters.length === 0) {
                        return interaction.reply({
                            content: 'Could not fetch monster list. Please try again later.',
                            ephemeral: true
                        });
                    }
                    
                    // Filter out already tracked monsters based on selected size
                    const trackedSet = selectedSize === 'smallest' ? trackedSmallest : trackedLargest;
                    const availableMonsters = monsters.filter(monster => 
                        !trackedSet.has(monster.name.toLowerCase())
                    );
                    
                    if (availableMonsters.length === 0) {
                        return interaction.reply({
                            content: `You've already tracked all monsters for ${selectedSize} size! Use /missing to see your progress.`,
                            ephemeral: true
                        });
                    }
                    
                    // Create monster selection menu
                    const monsterMenu = new StringSelectMenuBuilder()
                        .setCustomId('select_monster')
                        .setPlaceholder('Choose a monster')
                        .addOptions(
                            availableMonsters.map(monster => ({
                                label: monster.name,
                                value: monster.name.toLowerCase(),
                                description: `Track ${selectedSize} ${monster.name}`
                            })).slice(0, 25) // Discord has a limit of 25 options
                        );

                    const row = new ActionRowBuilder().addComponents(monsterMenu);

                    await interaction.reply({
                        content: `Select a monster to track as **${selectedSize}**:`,
                        components: [row],
                        ephemeral: true
                    });
                } else if (interaction.customId === 'select_monster') {
                    const selectedMonster = interaction.values[0];
                    const selectedSize = userSession.selectedSize;
                    
                    if (!selectedSize) {
                        return interaction.reply({
                            content: 'Please select a size first! Use /track to start over.',
                            ephemeral: true
                        });
                    }
                    
                    logger.info(`Logging ${selectedSize} ${selectedMonster} for user ${userId}`);

                    db.run(
                        "INSERT OR REPLACE INTO encounters (user_id, monster_name, size) VALUES (?, ?, ?)",
                        [userId, selectedMonster, selectedSize],
                        async (err) => {
                            if (err) {
                                logger.error('Database insert error:', err);
                                return interaction.reply({
                                    content: 'Error logging encounter.',
                                    ephemeral: true
                                });
                            }

                            // Clear the session data
                            client.userSessions.delete(userId);
                            
                            await interaction.reply({
                                content: `Successfully logged **${selectedSize}** **${selectedMonster}** encounter!`,
                                ephemeral: true
                            });
                            logger.info(`Successfully logged encounter for user ${userId}`);
                        }
                    );
                }
            }
        } catch (error) {
            logger.error('Error handling interaction:', error);
            try {
                const reply = {
                    content: 'There was an error while executing this command!',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            } catch (e) {
                logger.error('Error sending error message:', e);
            }
        }
    }
};