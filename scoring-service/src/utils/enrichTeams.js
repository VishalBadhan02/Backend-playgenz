
const enrichedTeams = async (playersWithoutId, finalResponse) => {
    try {
        const enrichedNotifications = playersWithoutId.map(player => {
            const user = finalResponse.find(u => String(u._id) === String(player.playerId));

            if (user) {
                return {
                    modalId: player._id,
                    id: user._id,
                    name: user.firstName,
                    avatar: user.profilePicture || null, // or some default
                    role: player.commit,
                    joinedDate: new Date(player.createdAt).toLocaleDateString(),
                    status: player.status,
                };
            }

            // Optional: handle missing user
            return {
                id: player.playerId,
                name: 'Unknown',
                avatar: null,
                role: player.commit,
                joinedDate: player.createdAt,
                status: 'inactive',
            };
        });

        return enrichedNotifications;

    } catch (error) {
        console.error("Error in enrichNotifications:", error);
        return error;
    }
};



module.exports = { enrichedTeams }