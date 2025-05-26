const teamClient = require("../grpc-clients/teamClient");

class grpcClientService {
    constructor() { }

    // Get the last message in a conversation
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

    async ScheduleMatchResponse(data) {
        try {
            const response = await new Promise((resolve, reject) => {
                teamClient.BulkCreateSchedules({ matches: data }, (error, response) => {
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

