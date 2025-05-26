const { AddTeamMemberModel } = require("../models/addTeamMember");
const { ScheduledMatchModel } = require("../models/scheduledMatch");
const { TeamModel } = require("../models/team");


class TeamService {
    constructor() { }

    // Get the last message in a conversation
    async handleTeamRegisteation(formData, user_id) {
        try {
            const team = new TeamModel({
                user_id,
                ...formData,
            })
            await team.save()
            if (!team) {
                return false
            }
            return team
        } catch (error) {
            throw error;
        }
    }


    async addPlayerInPlayerModal(playerData) {
        try {
            const player = new AddTeamMemberModel({
                ...playerData
            })
            await player.save()
            if (!player) {
                return false
            }
            return player
        } catch (error) {
            throw error;
        }
    }


    // Get count of unread messages in a conversation
    async checkUniqueName(teamName, _id) {
        const query = _id ? { teamName, _id: { $ne: _id } } : { teamName };

        try {
            const unique = await TeamModel.findOne(query)
            if (unique) {
                return false
            }
            return true
        } catch (error) {
            throw error;
        }
    }

    // user can make only one team for one sport here 
    async checkGameExisting(user_id, games) {
        try {
            const unique = await TeamModel.findOne({ user_id, games });
            if (!unique) {
                return false;
            }
            return unique;
        } catch (error) {
            throw error;
        }
    }

    async findTeam(_id) {
        try {
            const team = await TeamModel.findOne({ _id });
            if (!team) {
                return false;
            }
            return team;
        } catch (error) {
            throw error;
        }
    }

    async updateMembersModal(query, updateData) {
        try {
            const member = await AddTeamMemberModel.findOneAndUpdate(query, { $set: updateData });
            if (!member) {
                return false;
            }
            return member;

        } catch (error) {
            throw error;
        }
    }

    async fetchTeamMembers(query) {
        return await AddTeamMemberModel.find(query).populate("teamId", "teamName createdAt profilePicture")
            .select("-__v");
    }

    async fetchScheduledMatches(query) {
        return await ScheduledMatchModel.find(query);
    }

    async ScheduledMatches(teamIds, user) {
        return await ScheduledMatchModel.find({
            $and: [
                // Team condition
                {
                    $or: [
                        { homeTeam: { $in: teamIds } },
                        { awayTeam: { $in: teamIds } }
                    ]
                },
                // Status and reMatch conditions
                {
                    $or: [
                        { internalStatus: { $in: [1, 2] } },  // Accepted or completed matches
                        { reMatch: 1 }                 // Rematch games
                    ]
                }
            ]
        })
            .populate([
                { path: 'homeTeam' },
                { path: 'awayTeam' }
            ])
            .lean() // Convert documents to plain objects in one go
            .then((matchData) =>
                matchData.map((match) => ({
                    ...match,
                    sessionId: user
                }))
            );

    }

    async findTeamMembers(query) {
        try {
            const member = await AddTeamMemberModel.findOneAndUpdate(query);
            if (!member) {
                return false;
            }
            return member;

        } catch (error) {
            throw error;
        }
    }

    async fetchRegisteredTeam(query, game) {
        try {
            const member = await TeamModel.find(query).limit(15);
            return member;
        } catch (error) {
            throw error;
        }
    }

    async fetchUserTeams(userId) {
        return await TeamModel.find({ user_id: userId }, '_id');
    }

    async ScheduledMatch(matchData) {
        try {
            const match = new ScheduledMatchModel({
                ...matchData
            });
            if (!match) {
                return false;
            }
            await match.save();
            return match;
        } catch (error) {
            throw error;
        }
    }

    async bulkMatchScheduling(matchData) {
        try {
            const match = await ScheduledMatchModel.insertMany(matchData);
            if (!match) {
                return false;
            }
            return match;
        } catch (error) {
            throw error;
        }
    }

    async findScheduledMatch(query) {
        try {
            const match = await ScheduledMatchModel.findOneAndUpdate(query);
            if (!match) {
                return false;
            }
            return match;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new TeamService();
