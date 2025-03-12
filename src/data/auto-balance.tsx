import { Player, ZoneScores, Weighting, ScoredPlayer } from "@/data/types"; // Importing from shared file

type TeamZones = [
    defense: ScoredPlayer[],     // 0: Defense
    attack: ScoredPlayer[],      // 1: Attack
    athleticism: ScoredPlayer[]  // 2: Athleticism
];

type TeamResults = {
    teamA: TeamZones;  // Represents the first team
    teamB: TeamZones;  // Represents the second team
}

const getIdealDistribution = (numPlayers: number, isDamond: boolean = true) => {
    let baseSize = 0;
    let remainder = 0;
    let idealDistribution = { attack: 0, midfield: 0, defense: 0 };

    if (isDamond) {
        baseSize = Math.floor((numPlayers - 1) / 3);
        idealDistribution = { attack: baseSize, midfield: baseSize + 1, defense: baseSize };
        remainder = (numPlayers - 1) % 3;

        if (remainder === 1) {
            idealDistribution.defense += 1;
        } else if (remainder === 2) {
            idealDistribution.defense += 1;
            idealDistribution.midfield += 1;
        }
    } else {
        baseSize = Math.floor((numPlayers) / 3);
        idealDistribution = { attack: baseSize, midfield: baseSize, defense: baseSize };
        remainder = (numPlayers) % 3;

        if (remainder === 1) {
            idealDistribution.midfield += 1;
        } else if (remainder === 2) {
            idealDistribution.defense += 1;
            idealDistribution.midfield += 1;
        }
    }


    return idealDistribution;
}

const applyRandom = (players: ScoredPlayer[], zone: number) => {
    for (let i = 0; i < players.length - 1; i++) {
        if (Math.abs(players[i].zoneFit[zone] - players[i + 1].zoneFit[zone]) < 0.2 * players[i].zoneFit[zone]) {
            if (Math.random() < 0.5) {
                [players[i], players[i + 1]] = [players[i + 1], players[i]];
            }
        }
    }
};

const calculateScores = (players: Player[], zoneWeights: Weighting): ScoredPlayer[] => {
    return players.map(player => {
        // Calculate the zone scores as an array (not an object)
        const zoneScores: ZoneScores = [
            player.stats[1] * zoneWeights[0][1] + player.stats[0] * zoneWeights[0][0] + player.stats[2] * zoneWeights[0][2], // Defense
            player.stats[1] * zoneWeights[1][1] + player.stats[0] * zoneWeights[1][0] + player.stats[2] * zoneWeights[1][2], // Attack
            player.stats[1] * zoneWeights[2][1] + player.stats[0] * zoneWeights[2][0] + player.stats[2] * zoneWeights[2][2]  // Athleticism
        ];

        // Create the ScoredPlayer object by extending Player
        const scoredPlayer: ScoredPlayer = {
            ...player,         // Spread the player properties
            zoneFit: zoneScores // Add the zoneFit property (which is a ZoneScores array)
        };

        return scoredPlayer;
    });
};


const assignPlayersToTeams = (players: ScoredPlayer[], teamA: TeamZones, teamB: TeamZones) => {
    let teamATotalScore = 0;
    let teamBTotalScore = 0;

    let teamAZoneScores = [0, 0, 0];
    let teamBZoneScores = [0, 0, 0];

    // Dynamic weighting ratio
    const rand = Math.random();
    let specializationRatios = [rand * 0.3 + 0.5, rand * 0.2 + 0.0, rand * 0.5 + 0.2];

    const assignPlayersToZone = (playerPool: ScoredPlayer[], zone: number, count: number) => {
        const ratio = specializationRatios[zone];
        // Sort player pool by specialization in the zone
        playerPool.sort((a, b) => {
            const aAvgOther = Object.values(a.zoneFit).reduce((sum, val, idx) => idx !== zone ? sum + val : sum, 0) / 2;
            const bAvgOther = Object.values(b.zoneFit).reduce((sum, val, idx) => idx !== zone ? sum + val : sum, 0) / 2;

            const aSpecialization = a.zoneFit[zone] - aAvgOther;
            const bSpecialization = b.zoneFit[zone] - bAvgOther;

            return (bSpecialization * ratio + b.zoneFit[zone] * (1.0 - ratio)) -
                (aSpecialization * ratio + a.zoneFit[zone] * (1.0 - ratio));
        });

        applyRandom(playerPool, zone); // Minor randomness to avoid overfitting

        for (let i = 0; i < count; i++) {
            let player = playerPool.shift();
            if (player) {  // Ensure player is not undefined
                let teamAHasLowerScore = teamAZoneScores[zone] <= teamBZoneScores[zone];
                let teamAIsBehind = teamATotalScore <= teamBTotalScore;

                if (teamAHasLowerScore && teamAIsBehind) {
                    teamA[zone].push(player);
                    teamAZoneScores[zone] += player.zoneFit[zone];
                    teamATotalScore += player.zoneFit[zone];
                } else {
                    teamB[zone].push(player);
                    teamBZoneScores[zone] += player.zoneFit[zone];
                    teamBTotalScore += player.zoneFit[zone];
                }
            }

        }
    };

    // Total number of players for each team
    // if total players is odd, the extra player will always go to midfield
    const numTeamPlayers = Math.floor(players.length / 2);
    const numTeamTopPlayers = Math.floor(numTeamPlayers / 2);

    const idealDistribution = getIdealDistribution(numTeamPlayers, true);
    const topDistribution = getIdealDistribution(numTeamTopPlayers, true);

    const topAttackers = topDistribution.attack * 2;
    const topDefenders = topDistribution.defense * 2;
    const topMidfielders = topDistribution.midfield * 2;

    // Assign top players in a staggered way
    if (topDefenders > 0) assignPlayersToZone(players, 0, topDefenders);
    if (topAttackers > 0) assignPlayersToZone(players, 2, topAttackers);
    if (topMidfielders > 0) assignPlayersToZone(players, 1, topMidfielders);

    const remainingAttackers = (idealDistribution.attack * 2) - topAttackers;
    const remainingDefenders = (idealDistribution.defense * 2) - topDefenders;
    const remainingMidfielders = players.length - remainingAttackers - remainingDefenders;

    if (remainingDefenders > 0) assignPlayersToZone(players, 0, remainingDefenders);
    if (remainingAttackers > 0) assignPlayersToZone(players, 2, remainingAttackers);
    if (remainingMidfielders > 0) assignPlayersToZone(players, 1, remainingMidfielders);

    return { teamA, teamB };
};


const populateZoneScores = (team: TeamZones, teamZoneScores: ZoneScores) => {
    for (let zone = 0; zone <= 2; zone++) {
        if (team[zone]) {
            team[zone].forEach(player => {
                if (player.zoneFit && typeof player.zoneFit[zone] === "number") {
                    teamZoneScores[zone] += player.zoneFit[zone];
                }
            });
        }
    }
};

const assignPositions = (team: TeamZones) => {
    let positions: Player[] = [];

    Object.entries(team).forEach(([zone, players]) => {
        let numPlayersInZone = players.length;
        let maxSpread = 0.4; // Max width for players
        let y = 1.0 - ((parseInt(zone) + 1) / 4);

        // Sort players based on zone priority (Best → Worst)
        players.sort((a, b) => {
            return b.zoneFit[0] - a.zoneFit[0];
        });

        let positionsForZone: Player[] = [];


        if (numPlayersInZone <= 0) {
            return;
        }

        if (numPlayersInZone <= 1) {
            positionsForZone.push({
                id: players[0].id,
                name: players[0].name,
                stats: players[0].stats,
                position: { x: 0.5, y },
                team: null,
                guest: null,
                temp_formation: null,
            });
        } else if (numPlayersInZone == 2) {
            // Standard symmetry for 2 or fewer players
            let xPositions = [];
            let halfCount = Math.ceil(numPlayersInZone / 2);
            for (let i = 0; i < halfCount; i++) {
                let relativePosition = ((i + (numPlayersInZone % 2 === 0 ? 0.5 : 1)) / (halfCount + 0.5)) * maxSpread;
                xPositions.push(0.5 - relativePosition, 0.5 + relativePosition);
            }
            xPositions = xPositions.slice(0, numPlayersInZone);

            players.forEach((player, index) => {
                positionsForZone.push({
                    id: player.id,
                    name: player.name,
                    stats: player.stats,
                    position: { x: xPositions[index], y },
                    team: null,
                    guest: null,
                    temp_formation: null,
                });
            });

        } else {
            // For more than 3 players, pick central players and push weaker ones wide
            let coreCount = numPlayersInZone - 2; // Central players count
            let corePlayers = players.slice(0, coreCount); // Best players
            let widePlayers = players.slice(coreCount).sort((a, b) => (b.stats[2] - a.stats[2])); // Least skilled/more athletic

            // Assign central players symmetrically around the middle
            let xPositions = [];
            let halfCount = Math.floor(coreCount / 2);

            if (coreCount % 2 === 1) {
                // Odd number of core players: the central player at 0.5
                let bestCorePlayer = corePlayers.shift(); // Remove central player from the list
                if (bestCorePlayer) {  // Ensure bestCorePlayer is not undefined
                    positionsForZone.push({
                        id: bestCorePlayer.id,
                        name: bestCorePlayer.name,
                        stats: bestCorePlayer.stats,
                        position: { x: 0.5, y },
                        team: bestCorePlayer.team || null,        // Assuming default value of null if not available
                        guest: bestCorePlayer.guest || null,      // Assuming default value of null if not available
                        temp_formation: bestCorePlayer.temp_formation || null, // Assuming default value of null if not available
                    });
                }
            }

            // Assign the remaining core players symmetrically
            for (let i = 0; i < halfCount; i++) {
                let relativePosition = ((i + 1) / (halfCount + 1)) * maxSpread * 0.7; // More central spacing
                xPositions.push(0.5 - relativePosition, 0.5 + relativePosition);
            }

            // Add core players to the positions list
            xPositions = xPositions.slice(0, corePlayers.length);
            corePlayers.forEach((player, index) => {
                positionsForZone.push({
                    id: player.id,
                    name: player.name,
                    stats: player.stats,
                    position: { x: xPositions[index], y },
                    team: null,
                    guest: null,
                    temp_formation: null,
                });
            });

            // Assign wide players to the outermost positions
            positionsForZone.push({
                id: widePlayers[0].id,
                name: widePlayers[0].name,
                stats: widePlayers[0].stats,
                position: { x: 0.5 - maxSpread, y },
                team: null,        // Assuming default value of null if not available
                guest: null,      // Assuming default value of null if not available
                temp_formation: null, // Assuming default value of null if not available
            });
            positionsForZone.push({
                id: widePlayers[1].id,
                name: widePlayers[1].name,
                stats: widePlayers[1].stats,
                position: { x: 0.5 + maxSpread, y },
                team: null,        // Assuming default value of null if not available
                guest: null,      // Assuming default value of null if not available
                temp_formation: null, // Assuming default value of null if not available
            });
        }

        positions.push(...positionsForZone);
    });

    return positions;
};

const getZones = (players: ScoredPlayer[], numSimulations: number = 250) => {
    let bestAssignment: TeamResults = {
        teamA: [
            [],  // Defense (index 0)
            [],  // Attack (index 1)
            []   // Athleticism (index 2)
        ],
        teamB: [
            [],  // Defense (index 0)
            [],  // Attack (index 1)
            []   // Athleticism (index 2)
        ]
    };
    let bestWeightedScore = -Infinity;

    // Tracking best values for clean output
    let bestTotalScores = { a: 0, b: 0 };
    let bestScoreDiff = Infinity;
    let bestVariance = Infinity;

    // Adjustable weights
    const W_total = 5.0;    // Maximize
    const W_balance = 100.0;  // Minimize
    const W_variance = 100.0; // Minimize

    for (let i = 0; i < numSimulations; i++) {
        let playersCopy = structuredClone(players);
        let teamA: TeamZones = [
            [],  // Defense (index 0)
            [],  // Attack (index 1)
            []   // Athleticism (index 2)
        ];
        let teamB: TeamZones = [
            [],  // Defense (index 0)
            [],  // Attack (index 1)
            []   // Athleticism (index 2)
        ];

        assignPlayersToTeams(playersCopy, teamA, teamB);

        let teamAZoneScores: ZoneScores = [0, 0, 0];
        let teamBZoneScores: ZoneScores = [0, 0, 0];;

        populateZoneScores(teamA, teamAZoneScores);
        populateZoneScores(teamB, teamBZoneScores);

        let teamATotalScore = teamAZoneScores.reduce((sum, value) => sum + value, 0);
        let teamBTotalScore = teamBZoneScores.reduce((sum, value) => sum + value, 0);

        let totalScore = teamATotalScore + teamBTotalScore;
        let scoreDiff = Math.abs(teamATotalScore - teamBTotalScore);
        let totalVariance = teamAZoneScores.reduce((sum, zoneScoreA, index) =>
            sum + Math.abs(zoneScoreA - teamBZoneScores[index]), 0
        );

        // **Apply meaningful scaling**
        let scaledTotalScore = Math.log1p(totalScore); // Log-scale to prevent dominance
        let scaledScoreDiff = 1 / (scoreDiff + 1); // Inverse scaling (lower diff = better)
        let scaledVariance = 1 / (totalVariance + 1); // Inverse scaling (lower variance = better)

        // Compute weighted score
        let weightedScore =
            W_total * scaledTotalScore +
            W_balance * scaledScoreDiff +
            W_variance * scaledVariance;

        // Pick best assignment based on weighted score
        if (weightedScore > bestWeightedScore) {
            bestWeightedScore = weightedScore;
            bestAssignment = { teamA: teamA, teamB: teamB };
            bestTotalScores = { a: teamATotalScore, b: teamBTotalScore };
            bestScoreDiff = scoreDiff;
            bestVariance = totalVariance;
        }
    }

    // Log clean output
    let teamAZoneScores: ZoneScores = [0, 0, 0];
    let teamBZoneScores: ZoneScores = [0, 0, 0];;

    populateZoneScores(bestAssignment.teamA, teamAZoneScores);
    populateZoneScores(bestAssignment.teamB, teamBZoneScores);

    console.log("===== Final Optimized Teams =====");
    console.log("Team A Zones (Defense, Midfield, Attack):", teamAZoneScores);
    console.log("Team B Zones (Defense, Midfield, Attack):", teamBZoneScores);
    console.log("==================================");
    console.log("Total Scores→ Team A: ", bestTotalScores);
    console.log("Score Difference (Lower is better) ", bestScoreDiff);
    console.log("Zonal Variance (Lower is better) → ", bestVariance / 3);
    console.log("==================================");

    return bestAssignment;
};

const normalizeWeights = (weights: Weighting): Weighting => {
    return weights.map(zone => {
        const total = zone.reduce((sum, val) => sum + val, 0);
        return total > 0
            ? zone.map(val => Math.fround(val / total)) // Normalize values
            : zone.slice(); // Return a copy if total is 0 (to avoid division by zero)
    }) as Weighting;
};

const generateBalancedTeams = (players: Player[], attributeWeights: Weighting) => {
    let teams: { teamA: TeamZones; teamB: TeamZones } = {
        teamA: [[], [], []],
        teamB: [[], [], []]
    };

    if (players.length < 2) return { a: [], b: [] };

    let scoredPlayers = calculateScores(players, normalizeWeights(attributeWeights));

    // this is just for logging purposes
    // kinda interesting to see the full sorted list
    // remove when this gets optimized
    scoredPlayers.sort((a, b) => {
        // Sort the zoneScores for both players in descending order
        const sortedA = [a.zoneFit[0], a.zoneFit[1], a.zoneFit[2]].sort((x, y) => y - x);
        const sortedB = [b.zoneFit[0], b.zoneFit[1], b.zoneFit[2]].sort((x, y) => y - x);

        // First check: Compare the highest score (first element in the sorted array)
        if (sortedA[0] !== sortedB[0]) {
            return sortedB[0] - sortedA[0]; // Higher max score comes first
        }

        // Second check: Compare the sum of the top two highest scores (first two elements)
        const topTwoA = sortedA[0] + sortedA[1];
        const topTwoB = sortedB[0] + sortedB[1];

        if (topTwoA !== topTwoB) {
            return topTwoB - topTwoA; // Higher sum of the top two scores comes first
        }

        // Third check: Compare the total sum of all three scores
        const totalA = sortedA.reduce((sum, score) => sum + score, 0);
        const totalB = sortedB.reduce((sum, score) => sum + score, 0);

        return totalB - totalA; // Higher total score comes first
    });

    console.log("===== Ranked Players With Zone Ratings (Best to Worst) =====", scoredPlayers);

    const numPlayers = players.length;

    const gkA = scoredPlayers[numPlayers - 1];
    const gkB = scoredPlayers[numPlayers - 2];

    scoredPlayers = scoredPlayers.slice(0, numPlayers - 2);

    teams = getZones(scoredPlayers);

    // Assign positions for both teams
    const positionsA = assignPositions(teams.teamA);
    const positionsB = assignPositions(teams.teamB);

    positionsA.push({
        id: gkA.id,
        name: gkA.name,
        stats: gkA.stats,
        position: { x: 0.5, y: 1.0 },
        team: null,        // Assuming default value of null if not available
        guest: null,      // Assuming default value of null if not available
        temp_formation: null, // Assuming default value of null if not available
    });

    positionsB.push({
        id: gkB.id,
        name: gkB.name,
        stats: gkB.stats,
        position: { x: 0.5, y: 1.0 },
        team: null,        // Assuming default value of null if not available
        guest: null,      // Assuming default value of null if not available
        temp_formation: null, // Assuming default value of null if not available
    });

    return { a: positionsA, b: positionsB };
};

export const autoCreateTeams = (players: Player[], attributeWeights: Weighting) => {
    if (players.length < 4) throw new Error("Not enough players to f orm teams");
    return generateBalancedTeams(players, attributeWeights);
};
