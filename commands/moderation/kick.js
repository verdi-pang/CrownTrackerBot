const { checkPermissions } = require('../../utils/permissions');

module.exports = {
    name: 'kick',
    description: 'Kick a member from the server',
    async execute(message, args) {
        try {
            if (!checkPermissions(message.member, 'KICK_MEMBERS')) {
                return message.reply('You do not have permission to use this command.');
            }

            if (!args.length) {
                return message.reply('Please mention a user to kick!');
            }

            const member = message.mentions.members.first();
            if (!member) {
                return message.reply('Please mention a valid member!');
            }

            if (!member.kickable) {
                return message.reply('I cannot kick this user!');
            }

            const reason = args.slice(1).join(' ') || 'No reason provided';

            await member.kick(reason);
            message.channel.send(`Successfully kicked ${member.user.tag} for: ${reason}`);
        } catch (error) {
            console.error('Error in kick command:', error);
            message.reply('There was an error executing the kick command.');
        }
    }
};
