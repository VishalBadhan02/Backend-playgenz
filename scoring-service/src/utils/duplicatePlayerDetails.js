const duplicatePlayerDetail = (duplicatePlayers, userMap) => {
    return duplicatePlayers.map(playerId => {
        const user = userMap.get(playerId);
        return user ? {
            userName: user.userName,
            playerId: user._id
        } : { userName: 'Unknown', playerId };
    });
}

module.exports = {
    duplicatePlayerDetail
}