const enrichedUserData = (userData, teamData) => {
    return enrichedTeams = teamData.map(player => {
        const userInfo = userData.get(player.playerId);
        return {
            ...player,
            userName: userInfo?.userName || 'Unknown',
            profilePicture: userInfo?.profilePicture || '',
            firstName: userInfo?.firstName || '',
        };
    });
}

module.exports = {
    enrichedUserData
}