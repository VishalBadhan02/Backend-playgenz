const playerStatsUpdate = (scorecard, playerId, stats, isBowler = false) => {
    const { runs, isExtra, extraType } = stats;

    // Choose team: batting or bowling
    const players = isBowler
        ? scorecard.teams.teamB.players  // Assume teamB is bowling
        : scorecard.teams.teamA.players; // Assume teamA is batting


    players.forEach((player) => {
        if (player.playerId === playerId) {
            if (!player.statistics) {
                player.statistics = new Map();
            }

            if (!isBowler) {
                // Batter stats
                if (!isExtra) {
                    updateStat(player, 'runs', runs);
                    updateStat(player, 'ballsFaced', 1);
                    if (runs === 4) updateStat(player, 'fours', 1);
                    if (runs === 6) updateStat(player, 'sixes', 1);
                } else {
                    updateStat(player, 'ballsFaced', 0); // extras don't count as balls faced
                }
            } else {
                // Bowler stats
                updateStat(player, 'runsConceded', runs);
                if (!isExtra) {
                    updateStat(player, 'ballsConceded', 1);
                }
                // Optionally track no balls, wides, etc. using extraType
            }
        }
    });

    return scorecard;
};


const matchStatsUpdate = (scorecard, stats, innings) => {
    const { runs, isExtra, extraType } = stats;

    const inningData = innings === 1 ? scorecard.firstInnings : scorecard.secondInnings;


    // Ensure statistics is a Map
    if (!(inningData.statistics instanceof Map)) {
        inningData.statistics = new Map(Object.entries(inningData.statistics || {}));
    }

    // Helper function to update match statistics
    const updateMatchStat = (key, value) => {
        if (!inningData.statistics.has(key)) {
            inningData.statistics.set(key, 0);
        }
        // Increment the statistic
        const prev = inningData.statistics.get(key) || 0;
        inningData.statistics.set(key, prev + value);
    };

    // Update total runs
    updateMatchStat('runs', runs);

    // Update balls only if not extra
    if (!isExtra) {
        updateMatchStat('balls', 1);
    }

    // Optional: track extras by type
    if (isExtra) {
        updateMatchStat('extras', runs);
        updateMatchStat(`extras.${extraType}`, runs); // e.g., extras.wide = 1
    }

    return scorecard;
};

// Helper function to initialize and increment stats
function updateStat(player, statType, statValue) {
    if (!player.statistics.has(statType)) {
        player.statistics.set(statType, 0);
    }
    player.statistics.set(statType, player.statistics.get(statType) + statValue);
}

function updateLivePlayerStats(playerObj, data, isBatsman) {
    if (!playerObj.statistics) {
        playerObj.statistics = {};
    }

    const { runs, isExtra, extraType } = data;

    if (isBatsman) {
        // For striker
        playerObj.statistics.runs = (playerObj.statistics.runs || 0) + runs;

        if (!isExtra) {
            playerObj.statistics.balls = (playerObj.statistics.balls || 0) + 1;
        }

        if (runs === 4) {
            playerObj.statistics.fours = (playerObj.statistics.fours || 0) + 1;
        } else if (runs === 6) {
            playerObj.statistics.sixes = (playerObj.statistics.sixes || 0) + 1;
        }
    } else {
        // For bowler
        playerObj.statistics.runsConceded = (playerObj.statistics.runsConceded || 0) + runs;

        if (!isExtra) {
            playerObj.statistics.ballsBowled = (playerObj.statistics.ballsBowled || 0) + 1;

            // Calculate overs (optional)
            const balls = playerObj.statistics.ballsBowled;
            const overs = Math.floor(balls / 6) + "." + (balls % 6);
            playerObj.statistics.overs = overs;
        }

        // You can handle wicket or maiden logic here later
    }

    return playerObj;
}

const rotateStrike = (sportSpecificDetails, stats, isOverEnd = false) => {
    const { runs, isExtra } = stats;

    // Helper to swap striker and non-striker
    const swap = () => {
        const temp = sportSpecificDetails.striker;
        sportSpecificDetails.striker = sportSpecificDetails.nonStriker;
        sportSpecificDetails.nonStriker = temp;
    };

    // Rotate strike if:
    // - it's not an extra AND
    // - runs scored are odd
    if (!isExtra && runs % 2 === 1) {
        swap();
    }

    // Rotate at end of over regardless
    if (isOverEnd) {
        swap();
    }

    return sportSpecificDetails;
};




function generateDelta(before, after, prefix = "") {
    const delta = {};
    for (const key in after) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        if (typeof after[key] === "object" && after[key] !== null && !(after[key] instanceof Array)) {
            Object.assign(delta, generateDelta(before[key] || {}, after[key], fullPath));
        } else if (JSON.stringify(after[key]) !== JSON.stringify(before?.[key])) {
            delta[fullPath] = after[key];
        }
    }
    return delta;
}



module.exports = {
    playerStatsUpdate,
    matchStatsUpdate,
    updateLivePlayerStats,
    rotateStrike,
    generateDelta
}