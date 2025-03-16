const logger = require('./logger');

function checkPermissions(member, permission) {
    try {
        return member.permissions.has(permission);
    } catch (error) {
        logger.error(`Error checking permissions: ${permission}`, error);
        return false;
    }
}

module.exports = {
    checkPermissions
};
