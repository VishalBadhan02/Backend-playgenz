const formatePlayerData = (userId, playerId, userName, teamId, status, commit) => {
    const data = {
        userId,
        playerId,
        userName,
        teamId,
        status,
        commit
    }
    return data
}

const formateTeamData = (
    id,
    name,
    sport,
    description,
    location,
    foundedDate,
    logo,
    coverImage,
    members,
    joinTeam,
    teamVisibility,
    memberVisibility,
    openPositions,
    wins,
    losses,
    upcomingMatches,) => {
    const data = {
        id,
        name,
        sport,
        description,
        location,
        foundedDate,
        logo,
        coverImage,
        members,
        openPositions,
        wins,
        losses,
        upcomingMatches,
        joinTeam,
        teamVisibility,
        memberVisibility,
    }
    return data
}

module.exports = {
    formatePlayerData, formateTeamData
}