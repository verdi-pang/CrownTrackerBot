module.exports = {
    name: 'help',
    description: 'List all commands or info about a specific command',
    execute(message, args) {
        try {
            const { commands } = message.client;
            
            if (!args.length) {
                const commandList = commands.map(command => {
                    return `\`${command.name}\`: ${command.description}`;
                }).join('\n');
                
                return message.channel.send({
                    embeds: [{
                        title: '📚 Available Commands',
                        description: commandList,
                        color: 0x0099ff
                    }]
                });
            }

            const commandName = args[0].toLowerCase();
            const command = commands.get(commandName);

            if (!command) {
                return message.reply('That command does not exist!');
            }

            message.channel.send({
                embeds: [{
                    title: `Command: ${command.name}`,
                    description: command.description,
                    color: 0x0099ff
                }]
            });
        } catch (error) {
            console.error('Error in help command:', error);
            message.reply('There was an error executing the help command.');
        }
    }
};
