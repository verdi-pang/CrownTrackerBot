const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

async function loadCommands(client) {
    try {
        const commandFolders = await fs.readdir(path.join(__dirname, '../commands'));
        
        for (const folder of commandFolders) {
            const commandFiles = await fs.readdir(path.join(__dirname, `../commands/${folder}`));
            
            for (const file of commandFiles) {
                if (!file.endsWith('.js')) continue;
                
                const command = require(`../commands/${folder}/${file}`);
                client.commands.set(command.name, command);
                logger.info(`Loaded command: ${command.name}`);
            }
        }
    } catch (error) {
        logger.error('Error loading commands:', error);
    }
}

module.exports = {
    loadCommands
};
