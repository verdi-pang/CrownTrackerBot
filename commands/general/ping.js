module.exports = {
    name: 'ping',
    description: 'Check bot latency',
    execute(message, args) {
        try {
            message.reply(`🏓 Pong! Latency: ${Date.now() - message.createdTimestamp}ms`);
        } catch (error) {
            console.error('Error in ping command:', error);
            message.reply('There was an error executing the ping command.');
        }
    }
};
