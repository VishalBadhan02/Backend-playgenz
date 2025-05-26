const formatedTeams = (teams, tournamentTeams) => {
    return teams?.map((team) => {
        const isInTournament = tournamentTeams?.some(tt => tt.teamID.toString() === team.id.toString());

        if (isInTournament) {
            const matchingTournament = tournamentTeams.find(tt => tt.teamID.toString() === team.id.toString());

            return {
                id: matchingTournament?._id,
                teamId: team.id,
                name: team.name,
                logo: team.imageUrl,
                players: 15,
                joinedDate: new Date(team.createdAt).toLocaleDateString(),
                status: matchingTournament.paymentStatus,
                contact: 'captain@royalstrikers.com'
            };
        }

        return null; // or filter out later
    }).filter(Boolean); // remove null entries if not in tournament
};

module.exports = { formatedTeams };