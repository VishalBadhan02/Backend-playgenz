const teamClient = require("../grpc-clients/teamClient");
const userClient = require("../grpc-clients/userClient");

class grpcClientService {
    constructor() { }

    // Get the last message in a conversation
    async getUserFromUserService(data) {
        try {
            const response = await new Promise((resolve, reject) => {
                userClient.GetUserIds({ users: data }, (error, response) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(response);
                    }
                });
            });
            return response;
        } catch (error) {
            return error
        }
    }
    async getTeamFromTeamService(data) {
        try {
            const response = await new Promise((resolve, reject) => {
                teamClient.GetTeamIds({ teams: data }, (error, response) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(response);
                    }
                });
            });
            return response;
        } catch (error) {
            return error
        }
    }

    async getFreindModalResponse(id, action) {
        try {
            const response = await new Promise((resolve, reject) => {
                userClient.GetModalId({ _id: id, action: action }, (error, response) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(response);
                    }
                });
            });
            return response;
        } catch (error) {
            return error
        }
    }
}

module.exports = new grpcClientService();




// const userClient = require("../grpc-clients/userClient");
// const teamClient = require("../grpc-clients/teamClient");
// const tournamentClient = require("../grpc-clients/tournamentClient");
// const venueClient = require("../grpc-clients/venueClient");
// const scoreClient = require("../grpc-clients/scoreClient");

// class grpcClientService {
//     constructor() { }

//     async getUserFromUserService(data) {
//         return this.makeGrpcCall(userClient.GetUserIds, { users: data });
//     }

//     // async getTeamFromTeamService(data) {
//     //     return this.makeGrpcCall(teamClient.GetTeamIds, { teams: data });
//     // }

//     // async getTournamentFromTournamentService(data) {
//     //     return this.makeGrpcCall(tournamentClient.GetTournamentIds, { tournaments: data });
//     // }

//     // async getVenueFromVenueService(data) {
//     //     return this.makeGrpcCall(venueClient.GetVenueIds, { venues: data });
//     // }

//     // async getScoreFromScoreService(data) {
//     //     return this.makeGrpcCall(scoreClient.GetScoreIds, { scores: data });
//     // }

//     // 🔁 Reusable gRPC wrapper
//     makeGrpcCall(method, requestData) {
//         return new Promise((resolve, reject) => {
//             method(requestData, (error, response) => {
//                 if (error) {
//                     reject(error);
//                 } else {
//                     resolve(response);
//                 }
//             });
//         });
//     }
// }

// module.exports = new grpcClientService();


