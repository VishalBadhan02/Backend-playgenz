const teamClient = require("../grpc-clients/teamClient");
const tournamentlient = require("../grpc-clients/tournamentClient");
const userClient = require("../grpc-clients/userClient");

function getTournament(id) {
    return new Promise((resolve, reject) => {
        tournamentlient.GetTournament({ id }, (error, response) => {
            if (error) {
                console.error("Error fetching tournament:", error.message);
                reject(error);
            } else {
                resolve(response.tournament);
            }
        });
    });
}

function getMatch(id) {
    return new Promise((resolve, reject) => {
        teamClient.GetMatch({ id }, (err, response) => {
            if (err) {
                console.error("Error fetching match:", err.message);
                reject(err);
            } else {
                resolve(response.match);
            }
        });
    });
}

function getUsers(id) {
    return new Promise((resolve, reject) => {
        userClient.GetUserIds({ users: id }, (err, response) => {
            if (err) {
                console.error("Error fetching match:", err.message);
                reject(err);
            } else {
                resolve(response.bulk);
            }
        });
    });
}

// List multiple tournaments
function listTournaments(page = 1, limit = 5) {
    tournamentlient.ListTournaments({ page, limit }, (error, response) => {
        if (error) {
            console.error("Error listing tournaments:", error.message);
        } else {
            console.log("All Tournaments:");
            response.tournaments.forEach((t, i) => {
                console.log(`${i + 1}. ${t.name} (${t.sport})`);
            });
        }
    });
}

function updateFixtureRound(query) {
    return new Promise((resolve, reject) => {
        tournamentlient.GetMatchById(query, (error, response) => {
            if (error) {
                console.error("Error listing tournaments:", error.message);
                reject(error)
            } else {
                resolve(response)
            }
        })
    });

}


function listMatches(page = 1, limit = 5) {
    teamClient.ListMatches({ page: 1, limit: 5 }, (err, response) => {
        if (err) return console.error("Error listing matches:", err.message);
        console.log("📦 Matches:", response.matches);
    });
}
module.exports = {
    getTournament,
    listTournaments,
    getMatch,
    listMatches,
    getUsers,
    updateFixtureRound
};