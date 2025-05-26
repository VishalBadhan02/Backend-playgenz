const fetchPlayersId = (data) => {
    try {
        return data.map((notif) => notif?.playerId);
    } catch (error) {
        throw error;
    }
};

module.exports = {
    fetchPlayersId,
};
