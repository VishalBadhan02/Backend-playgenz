const formatedMatches = (matches) => {
    return matches?.map((match) => ({
        id: match._id,
        homeTeam: {
            name: match.homeTeam?.teamName,
            teamId: match.homeTeam?._id,
            // score: match.homeTeam?.score,
        },
        awayTeam: {
            name: match.awayTeam?.teamName,
            teamId: match.awayTeam?._id,
            // score: number
        },
        date: new Date(match?.matchDate).toLocaleDateString(),
        time: match?.matchTime || new Date(match?.matchDate).toLocaleTimeString(),
        venue: match?.matchLocation,
        status: match?.matchStatus,
        sessionId: match?.sessionId,
        matchType: match?.matchType,
    }));
}


module.exports = { formatedMatches };