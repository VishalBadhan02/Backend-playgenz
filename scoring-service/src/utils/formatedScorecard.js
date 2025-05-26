const formatedMatches = (
    id,
    match,
    teamAPlayers,
    teamA,
    sportType,
    tournamentId,
    teamB,
    teamBPlayers,
    currentTime,
    total_over,
    players,
    teamAName,
    teamBName
) => {
    const scoreCard = {
        matchId: id,
        sportType: sportType,
        scheduledMatch: match,
        tournamentId,
        // Teams Information
        teams: {
            teamA: {
                teamId: teamA,
                name: teamAName,
                score: 0,
                wickets: 0,
                players: teamAPlayers.map(player => ({
                    _id: player._id,
                    playerId: player.playerId,
                    userName: player.userName,
                    statistics: new Map()
                }))
            },
            teamB: {
                teamId: teamB,
                name: teamBName,
                score: 0,
                wickets: 0,
                players: teamBPlayers.map(player => ({
                    _id: player._id,
                    playerId: player.playerId,
                    userName: player.userName,
                    statistics: new Map()
                }))
            }
        },

        // Match Status
        matchStatus: 'scheduled',

        // Current Period/Inning
        currentPeriod: {
            periodNumber: 1,
            periodType: sportType === 'cricket' ? 'inning' : 'half',
            startTime: currentTime
        },

        // Sport Specific Details
        sportSpecificDetails: new Map(
            sportType === 'cricket'
                ? [
                    ['toss', null],
                    ['currentInning', 1],
                    ['totalOvers', total_over],
                    ['currentOver', 0],
                    ['striker', null],
                    ['nonStriker', null],
                    ['currentBowler', null],
                    ['players', players],
                ]
                : sportType === 'football'
                    ? [
                        ['currentHalf', 1],
                        ['timeElapsed', '00:00'],
                        ['possession', { teamA: 50, teamB: 50 }],
                        ['corners', { teamA: 0, teamB: 0 }],
                        ['fouls', { teamA: 0, teamB: 0 }]
                    ]
                    : []
        ),

        // Initialize empty match statistics
        matchStatistics: new Map()
    };
    // Add metadata if you're using it
    if (scoreCard.metadata) {
        scoreCard.metadata = {
            createdBy: req.user.id || 'VishalBadhan02',
            updatedBy: req.user.id || 'VishalBadhan02',
            matchStartTime: currentTime,
            lastUpdateTime: currentTime
        };
    }

    // Add initial timeline entry if you're using it
    if (scoreCard.timeline) {
        scoreCard.timeline = [{
            time: currentTime,
            updatedBy: req.user.id || 'VishalBadhan02',
            action: 'CREATE_MATCH',
            details: {
                matchId: id,
                sportType,
                teamA,
                teamB
            }
        }];
    }
    return scoreCard;
}

const formateScorecardData = (scorecard) => {
    const data = scorecard?._doc || scorecard;
    if (!data) return null;

    const sportSpecificDetailsObj = Object.fromEntries(data.sportSpecificDetails);

    const innings = sportSpecificDetailsObj.currentInning || 1;

    const inningData = innings === 1 ? sportSpecificDetailsObj.firstInnings : sportSpecificDetailsObj.secondInnings;

    const stats = inningData?.statistics;
    const scoreStats = stats instanceof Map
        ? Object.fromEntries(stats)
        : (typeof stats === 'object' && stats !== null ? stats : {});


    const cricketTeam1 = {
        id: data?.teams?.teamA?.teamId || "1234",
        name: data?.teams?.teamA?.name || "1234",
        logo: '/placeholder.svg',
        players: createPlayers(data?.teams?.teamA?.players)
    }

    const cricketTeam2 = {
        id: data?.teams?.teamB?.teamId,
        name: data?.teams?.teamB?.name,
        logo: '/placeholder.svg',
        players: createPlayers(data?.teams?.teamB?.players)
    }

    const battingCards1 = createBattingCards(cricketTeam1);
    const battingCards2 = createBattingCards(cricketTeam2);

    const cricketMatch = {
        id: data?._id || "1234",
        tournamentId: data?.tournamentId || "1234",
        sportType: data?.sportType || "cricket",
        teams: {
            home: cricketTeam1,
            away: cricketTeam2
        },
        venue: 'National Cricket Ground',
        date: new Date(Date.now() + 7200000).toISOString(),
        status: 'live',
        toss: sportSpecificDetailsObj?.toss || null,
    }

    const mockCricketScorecard = {
        match: cricketMatch,
        format: 'T20',
        currentInnings: sportSpecificDetailsObj?.currentInnings || 1,
        totalInnings: 2,
        score: {
            batting: {
                team: cricketTeam1,
                runs: scoreStats?.runs || 0,
                wickets: scoreStats?.wickets || 0,
                overs: scoreStats?.overs || 0,
                extras: {
                    wide: 3,
                    noBall: 1,
                    byes: 2,
                    legByes: 1,
                    penalty: 0
                }
            },
            bowling: {
                team: cricketTeam2
            }
        },
        battingOrder: {
            [cricketTeam1.id]: battingCards1,
            [cricketTeam2.id]: battingCards2
        },
        bowlingStats: {
            [cricketTeam1.id]: createBowlingCards(cricketTeam1),
            [cricketTeam2.id]: createBowlingCards(cricketTeam2)
        },
        currentBatsmen: {
            striker: sportSpecificDetailsObj?.striker?.userName || null,
            nonStriker: sportSpecificDetailsObj?.nonStriker?.userName || null
        },
        currentBowler: pcreateBowlingCards(cricketTeam1 || null, sportSpecificDetailsObj),
        recentOvers: createRecentOvers(),
        partnership: {
            runs: 45,
            balls: 32
        },
        currentRunRate: scoreStats?.runRate,
        target: undefined,
        lastWicket: "P1 c P5 b P8 30(25)"
    };

    return mockCricketScorecard
}

const createPlayers = (teamPlayers) => {
    return teamPlayers?.map((value, index) => ({
        id: value?.playerId || "1234",
        name: value?.userName || "1234",
        status: value?.status || "1234",
        position: "batsman",
        jerseyNumber: index,
        isCaptain: "isCaptain",
        statistics: value?.statistics
    }))
};

const createBowlingCards = (team) => {
    // console.log("team", team)
    return team.players.slice(5, 11).map((player, index) => {
        if (index < 4) {
            const overs = 2 + Math.floor(Math.random() * 2);
            const runs = 15 + Math.floor(Math.random() * 20);
            const wickets = Math.floor(Math.random() * 2);

            return {
                player,
                overs: overs,
                maidens: Math.floor(Math.random() * 2),
                runs: runs,
                wickets: wickets,
                economy: +(runs / overs).toFixed(2),
                dots: Math.floor(Math.random() * 10),
                wides: Math.floor(Math.random() * 3),
                noBalls: Math.floor(Math.random() * 2)
            };
        } else {
            return {
                player,
                overs: 0,
                maidens: 0,
                runs: 0,
                wickets: 0,
                economy: 0,
                dots: 0,
                wides: 0,
                noBalls: 0
            };
        }
    });
};
const pcreateBowlingCards = (team, sportSpecificDetailsObj) => {
    const player = team.players?.find((player) => player?.id === sportSpecificDetailsObj?.currentBowler?.playerId);

    if (player) {
        const stats = Object.fromEntries(player?.statistics)
        console.log(stats)
        return {
            player,
            overs: ballsToOvers(stats?.ballsConceded || 0),
            maidens: 0,
            runs: stats?.runs || 0,
            wickets: stats?.wickets || 0,
            economy: calculateEconomy(stats?.runs || 0, stats?.ballsConceded || 0) || '0.0',
            dots: stats?.dots || 0,
            wides: stats?.wides || 0,
            noBalls: stats?.noBalls || 0
        };
    }

    return null;
};


const createRecentOvers = () => {
    const overs = [];
    for (let i = 1; i <= 8; i++) {
        const deliveries = [];
        let overRuns = 0;
        let overWickets = 0;

        for (let j = 1; j <= 6; j++) {
            const isWicket = Math.random() < 0.05;
            const isExtra = !isWicket && Math.random() < 0.1;
            const extraType = isExtra ? (['wide', 'noBall', 'bye', 'legBye'][Math.floor(Math.random() * 4)]) : undefined;
            const runs = isExtra ? (extraType === 'wide' || extraType === 'noBall' ? 1 : 0) + Math.floor(Math.random() * 2) :
                Math.floor(Math.random() * (Math.random() < 0.7 ? 2 : (Math.random() < 0.9 ? 4 : 6)));

            overRuns += runs;
            if (isWicket) overWickets++;

            deliveries.push({
                runs,
                isExtra,
                extraType,
                isWicket,
                isLegal: !isExtra || (extraType !== 'wide' && extraType !== 'noBall'),
                description: isWicket ? 'Caught at mid-off' : undefined
            });
        }

        overs.push({
            number: i,
            deliveries,
            runs: overRuns,
            wickets: overWickets
        });
    }

    return overs;
};


// Cricket batting cards generator
const createBattingCards = (team) => {
    return team.players?.slice(0, 11).map((player, index) => {
        // First two batters have played
        if (index < 2) {
            return {
                player,
                runs: 30 + Math.floor(Math.random() * 40),
                balls: 25 + Math.floor(Math.random() * 30),
                fours: Math.floor(Math.random() * 5),
                sixes: Math.floor(Math.random() * 3),
                strikeRate: 0, // Will be calculated
                dismissal: index === 0 ? {
                    type: 'caught',
                    bowler: team.players[8],
                    fielder: team.players[5],
                    description: 'Caught at mid-off'
                } : undefined
            };
        }
        // Current pair of batsmen
        else if (index >= 2 && index <= 3) {
            return {
                player,
                runs: 10 + Math.floor(Math.random() * 20),
                balls: 15 + Math.floor(Math.random() * 15),
                fours: Math.floor(Math.random() * 3),
                sixes: Math.floor(Math.random() * 2),
                strikeRate: 0 // Will be calculated
            };
        }
        // Yet to bat
        else {
            return {
                player,
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                strikeRate: 0
            };
        }
    });
};

const ballsToOvers = (balls) => {
    const overs = Math.floor(balls / 6);
    const remainingBalls = balls % 6;
    return `${overs || 0}.${remainingBalls || 0}`;
};

const calculateEconomy = (runsConceded, ballsBowled) => {
    const decimalOvers = ballsBowled / 6;
    if (decimalOvers === 0) return 0;
    return (runsConceded / decimalOvers).toFixed(2); // rounded to 2 decimal places
};

module.exports = { formatedMatches, formateScorecardData };





