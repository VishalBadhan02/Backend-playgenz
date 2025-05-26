const scorecardService = require("../services/scorecardService");
const { formateScorecardData } = require("../utils/formatedScorecard");
const { playerStatsUpdate, matchStatsUpdate, updateLivePlayerStats, rotateStrike, generateDelta } = require("../utils/scorecardUpdates");
const { setPlaying } = require("../utils/setPlaying");

async function ScoreUpdate(matchData, userConnections, ws) {
    try {
        const { matchId, data } = matchData;
        const { runs, isExtra, extraType, updatedBy, timestamp } = data;
        const playingUsers = new Map();

        // Fetch the scorecard from the database   
        const scorecard = await scorecardService.getScorecard({ matchId });

        //becasue sportSpecificDetails is in the map formate convert it to object

        if (!scorecard) {
            console.error('Scorecard not found for matchId:', matchId);
            return false;
        }

        // Use .toObject() to get a plain JS object
        const rawScorecard = scorecard.toObject({ depopulate: true });
        const beforeUpdate = await formateScorecardData(structuredClone(rawScorecard));

        const sportSpecificDetailsObj = Object.fromEntries(scorecard.sportSpecificDetails);


        const strikerId = sportSpecificDetailsObj.striker?.playerId;
        const nonStrikerId = sportSpecificDetailsObj.nonStriker?.playerId;
        const currentBowlerId = sportSpecificDetailsObj.currentBowler?.playerId;

        const playerId = isExtra ? currentBowlerId : strikerId || nonStrikerId;

        const innings = sportSpecificDetailsObj.currentInning || 1;

        // upading the bowler and batsman stats
        await playerStatsUpdate(scorecard, strikerId, data, true); // Batsman
        await playerStatsUpdate(scorecard, currentBowlerId, data, false); // Bowler

        // Update the match statistics
        await matchStatsUpdate(sportSpecificDetailsObj, data, innings);

        updateLivePlayerStats(sportSpecificDetailsObj.striker, data, true);
        updateLivePlayerStats(sportSpecificDetailsObj.currentBowler, data, false);

        // Check if end of over
        // const isOverEnd = !data.isExtra && scorecardOversShouldEnd(sportSpecificDetailsObj);
        // You define logic

        const inningData = innings === 1 ? sportSpecificDetailsObj.firstInnings : sportSpecificDetailsObj.secondInnings;

        const balls = inningData?.statistics?.get('balls') || 0;

        const isOverEnd = !isExtra && balls % 6 === 0;

        // --- Rotate strike if needed ---
        rotateStrike(sportSpecificDetailsObj, data, isOverEnd);

        // Convert back to Map before saving
        scorecard.sportSpecificDetails = new Map(Object.entries(sportSpecificDetailsObj));

        // save the updated scorecard
        await scorecard.save();
        const afterUpdate = await formateScorecardData(scorecard)

        const delta = generateDelta(beforeUpdate, afterUpdate);

        // console.log("sjdn", sjdn)
        ws.send(JSON.stringify({
            scorecard: delta,
        }));

    } catch (error) {
        console.error('Error updating score:', error);
    }
}

async function InningUpdate(req, res) {
    try {
        const update = await ScoreCardModel.findById(req.params.id)
        // console.log(req.body)
        if (!update) {
            return res.json(reply.failure("Match not found"))
        }
        if (req.body.status === "innings_setup") {
            update.matchStatus = req.body.status
            await update.save();
            return res.json(reply.success())
        }
        else if (req.body.status === "inningEnd") {
            const sportSpecificDetails = Object.fromEntries(update.sportSpecificDetails)
            const matchStatistics = Object.fromEntries(update.matchStatistics)
            sportSpecificDetails.currentInning = 2;
            sportSpecificDetails.currentOver = 0;
            sportSpecificDetails.striker = null;
            sportSpecificDetails.nonStriker = null;
            sportSpecificDetails.currentBowler = null;
            update.currentPeriod.periodNumber = 2;
            matchStatistics.totalScore = 0;
            matchStatistics.wickets = 0;
            update.matchStatus = "set_seccond_half"
            update.sportSpecificDetails = new Map(Object.entries(sportSpecificDetails));
            update.matchStatistics = new Map(Object.entries(matchStatistics));
        }
        else if (req.body.status === "winner") {
            await update.determineWinner();
            sportSpecificDetails.currentInning = 2;
            update.matchStatus = "completed"
            // console.log("here")

        }
        await update.save();

        return res.json(reply.success("Scorecard initialized", update._id));

    } catch (error) {
        return res.json(reply.failure("error updating new inning"))
    }
}


async function matchSetup(matchData, ws) {
    try {
        const { matchId, data } = matchData;
        const { toss, battingTeam, bowlingTeam, playerSettigns } = data;
        const scorecard = await scorecardService.getScorecard({ matchId });

        const userMap = new Map();
        const sportSpecificDetails = scorecard?.sportSpecificDetails;
        const teamAPlayer = scorecard?.teams.teamA.players;
        const teamBPlayer = scorecard?.teams.teamB.players;
        const totalPlayers = [...teamAPlayer, ...teamBPlayer];

        totalPlayers?.forEach(user => {
            userMap.set(user.playerId.toString(), user); // id here is same as playerId
        });

        //formating the data to the actual schema of scorecard
        const formatedDataforUpdate = {
            toss: { winner: toss.winner.id, winnerName: toss.winner.name, decision: toss.decision },
            inningChoice: toss.decision,
            striker: setPlaying(playerSettigns.selectedStriker, userMap),
            nonStriker: setPlaying(playerSettigns.selectedNonStriker, userMap),
            currentBowler: setPlaying(playerSettigns.selectedBowler, userMap),
            firstInnings: {
                battingTeam: battingTeam.id,
                battingTeamName: battingTeam.name,
                bowlingTeam: bowlingTeam.id,
                bowlingTeamName: bowlingTeam.name,
            },
            secondInnings: {
                battingTeam: bowlingTeam.id,
                battingTeamName: bowlingTeam.name,
                bowlingTeam: battingTeam.id,
                bowlingTeamName: battingTeam.name,
            }
        };

        // ✅ Convert to Map
        const sportDetailsMap = scorecard.sportSpecificDetails;

        // ✅ Update existing keys only
        for (const [key, value] of Object.entries(formatedDataforUpdate)) {
            sportDetailsMap.set(key, value);

        }

        // ✅ Convert back to plain object
        scorecard.sportSpecificDetails = sportDetailsMap;
        scorecard.markModified('sportSpecificDetails');
        await scorecard.save();

        const formatedData = formateScorecardData(scorecard);

        ws.send(JSON.stringify(formatedData));

    } catch (error) {
        console.log("Error occurring in the match setup");
        throw error;
    }
}

module.exports = {
    ScoreUpdate, InningUpdate, matchSetup
};