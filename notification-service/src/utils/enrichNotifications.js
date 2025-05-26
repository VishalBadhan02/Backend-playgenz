
const enrichNotifications = async (notifications, finalResponse) => {
    try {

        const enrichedNotifications = notifications.map(notification => {
            if (notification.type === 'user') {
                const user = finalResponse?.find(u => String(u._id) === String(notification.actorId));
                if (user) {
                    notification.data.name = user.userName || `${user.firstName} ${user.lastName}` || "Unknown User";
                }
            }
            if (notification.type === 'team') {
                const user = finalResponse?.find(u => String(u.userId) === String(notification.actorId) || String(u.id) === String(notification.actorId));
                if (user) {
                    notification.data.name = user.name || `${user.firstName} ${user.lastName}` || "Unknown User";
                }
            }
            if (notification.type === 'match') {
                const user = finalResponse?.find(u => (String(u.userId) === String(notification.actorId) || String(u.id) === String(notification.actorId) && notification.data.sport ===
                    u.sport));
                if (user) {
                    notification.data.name = user.name || `${user.firstName} ${user.lastName}` || "Unknown User";
                }
            }
            return notification;
        });

        return enrichedNotifications;

    } catch (error) {
        console.error("Error in enrichNotifications:", error);
        return error;
    }
}


module.exports = { enrichNotifications }