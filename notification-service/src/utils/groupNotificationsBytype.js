const groupNotificationsByType = (notifications) => {
    const grouped = {
        user: [],
        team: [],
        tournament: [],
        venue: [],
        score: [],
        match: [],
    };

    for (const notif of notifications) {
        const type = notif.type;

        if (grouped[type]) {
            grouped[type].push(notif.actorId);
        } else {
            // Optional: add unexpected types for debugging
            grouped[type] = [notif.actorId];
        }
    }

    return grouped;
};

module.exports = {
    groupNotificationsByType

}
