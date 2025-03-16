const { checkPermissions } = require('../../utils/permissions');

module.exports = {
    name: 'ban',
    description: 'Ban a member from the server',
    async execute(message, args) {
        try {
            if (!checkPermissions(message.member, 'BAN_MEMBERS')) {
                return message.reply('You do not have permission to use this command.');
            }

            if (!args.length) {
                return message.reply('Please mention a user to ban!');
            }

            const member = message.mentions.members.first();
            if (!member) {
                return message.reply('Please mention a valid member!');
            }

            if (!member.bannable) {
                return message.reply('I cannot ban this user!');
            }

            const reason = args.slice(1).join(' ') || 'No reason provided';

            await member.ban({ reason });
            message.channel.send(`Successfully banned ${member.user.tag} for: ${reason}`);
        } catch (error) {
            console.error('Error in ban command:', error);
            message.reply('There was an error executing the ban command.');
        }
    }
};
