const getIdealDistribution = (numPlayers, isDamond = true) => {
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

const applyRandom = (players, zone) => {
    for (let i = 0; i < players.length - 1; i++) {
        if (Math.abs(players[i].zoneScores[zone] - players[i + 1].zoneScores[zone]) < 0.2 * players[i].zoneScores[zone]) {
            if (Math.random() < 0.5) {
                [players[i], players[i + 1]] = [players[i + 1], players[i]];
            }
        }
    }
};

const calculateScores = (players, zoneWeights) => {
    return players.map(player => {
        let zoneScores = {
            0: player.attack * zoneWeights[0].attack + player.defense * zoneWeights[0].defense + player.athleticism * zoneWeights[0].athleticism,
            1: player.attack * zoneWeights[1].attack + player.defense * zoneWeights[1].defense + player.athleticism * zoneWeights[1].athleticism,
            2: player.attack * zoneWeights[2].attack + player.defense * zoneWeights[2].defense + player.athleticism * zoneWeights[2].athleticism
        };

        return { ...player, zoneScores };
    });
};

const assignPlayersToTeams = (players, teamA, teamB) => {
    if (players.length <= 0) return { teamA, teamB };

    let teamATotalScore = 0;
    let teamBTotalScore = 0;

    let teamAZoneScores = [0, 0, 0];
    let teamBZoneScores = [0, 0, 0];

    // Dynamic weighting ratio
    const rand = Math.random();
    let specializationRatios = [rand * 0.3 + 0.5, rand * 0.2 + 0.0, rand * 0.5 + 0.2];

    const assignPlayersToZone = (playerPool, zone, count) => {
        const ratio = specializationRatios[zone];
        // Sort player pool by specialization in the zone
        playerPool.sort((a, b) => {
            const aAvgOther = Object.values(a.zoneScores).reduce((sum, val, idx) => idx !== zone ? sum + val : sum, 0) / 2;
            const bAvgOther = Object.values(b.zoneScores).reduce((sum, val, idx) => idx !== zone ? sum + val : sum, 0) / 2;

            const aSpecialization = a.zoneScores[zone] - aAvgOther;
            const bSpecialization = b.zoneScores[zone] - bAvgOther;

            return (bSpecialization * ratio + b.zoneScores[zone] * (1.0 - ratio)) -
                (aSpecialization * ratio + a.zoneScores[zone] * (1.0 - ratio));
        });

        applyRandom(playerPool, zone); // Minor randomness to avoid overfitting

        for (let i = 0; i < count; i++) {
            let player = playerPool.shift();

            let teamAHasLowerScore = teamAZoneScores[zone] <= teamBZoneScores[zone];
            let teamAIsBehind = teamATotalScore <= teamBTotalScore;

            if (teamAHasLowerScore && teamAIsBehind) {
                teamA[zone].push(player);
                teamAZoneScores[zone] += player.zoneScores[zone];
                teamATotalScore += player.zoneScores[zone];
            } else {
                teamB[zone].push(player);
                teamBZoneScores[zone] += player.zoneScores[zone];
                teamBTotalScore += player.zoneScores[zone];
            }
        }
    };



    // Total number of players for each team
    // if total players is odd, the extra player will always go to midfield
    const numTeamPlayers = Math.floor(players.length / 2);
    const numTeamTopPlayers = Math.floor(numTeamPlayers / 2);

    const idealDistribution = getIdealDistribution(numTeamPlayers, true);

    let topAttackers = 0;
    let topDefenders = 0;
 
    if (numTeamTopPlayers > 0) {

        const topDistribution = getIdealDistribution(numTeamTopPlayers, true);

        topAttackers = topDistribution.attack * 2;
        topDefenders = topDistribution.defense * 2;
        const topMidfielders = topDistribution.midfield * 2;

        // Assign top players in a staggered way
        if (topDefenders > 0) assignPlayersToZone(players, 0, topDefenders);
        if (topAttackers > 0) assignPlayersToZone(players, 2, topAttackers);
        if (topMidfielders > 0) assignPlayersToZone(players, 1, topMidfielders);
    }

    const remainingAttackers = (idealDistribution.attack * 2) - topAttackers;
    const remainingDefenders = (idealDistribution.defense * 2) - topDefenders;
    const remainingMidfielders = players.length - remainingAttackers - remainingDefenders;

    if (remainingDefenders > 0) assignPlayersToZone(players, 0, remainingDefenders);
    if (remainingAttackers > 0) assignPlayersToZone(players, 2, remainingAttackers);
    if (remainingMidfielders > 0) assignPlayersToZone(players, 1, remainingMidfielders);



    return { teamA, teamB };
};


const populateZoneScores = (team, teamZoneScores) => {
    for (let zone = 0; zone <= 2; zone++) {
        if (team[zone]) {
            team[zone].forEach(player => {
                if (player.zoneScores && typeof player.zoneScores[zone] === "number") {
                    teamZoneScores[zone] += player.zoneScores[zone];
                }
            });
        }
    }
};

const assignPositions = (team) => {
    let positions = [];

    Object.entries(team).forEach(([zone, players]) => {
        let numPlayersInZone = players.length;
        let maxSpread = 0.4; // Max width for players
        let y = 1.0 - ((parseInt(zone) + 1) / 4);

        // Sort players based on zone priority (Best → Worst)
        players.sort((a, b) => {
            return b.zoneScores[0] - a.zoneScores[0];
        });

        let positionsForZone = [];

        if (numPlayersInZone <= 0) {
            return;
        }

        if (numPlayersInZone <= 1) {
            positionsForZone.push({ id: players[0].id, name: players[0].id.name, x: 0.5, y });
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
                positionsForZone.push({ id: player.id, name: player.name, x: xPositions[index], y });
            });
        } else {
            // For more than 3 players, pick central players and push weaker ones wide
            let coreCount = numPlayersInZone - 2; // Central players count
            let corePlayers = players.slice(0, coreCount); // Best players
            let widePlayers = players.slice(coreCount).sort((a, b) => (b.athleticism - a.athleticism)); // Least skilled/more athletic

            // Assign central players symmetrically around the middle
            let xPositions = [];
            let halfCount = Math.floor(coreCount / 2);

            if (coreCount % 2 === 1) {
                // Odd number of core players: the central player at 0.5
                let bestCorePlayer = corePlayers.shift(); // Remove central player from the list
                positionsForZone.push({ id: bestCorePlayer.id, name: bestCorePlayer.name, x: 0.5, y });
            }

            // Assign the remaining core players symmetrically
            for (let i = 0; i < halfCount; i++) {
                let relativePosition = ((i + 1) / (halfCount + 1)) * maxSpread * 0.7; // More central spacing
                xPositions.push(0.5 - relativePosition, 0.5 + relativePosition);
            }

            // Add core players to the positions list
            xPositions = xPositions.slice(0, corePlayers.length);
            corePlayers.forEach((player, index) => {
                positionsForZone.push({ id: player.id, name: player.name, x: xPositions[index], y });
            });

            // Assign wide players to the outermost positions
            positionsForZone.push({ id: widePlayers[0].id, name: widePlayers[0].name, x: 0.5 - maxSpread, y });
            positionsForZone.push({ id: widePlayers[1].id, name: widePlayers[1].name, x: 0.5 + maxSpread, y });
        }

        positions.push(...positionsForZone);
    });

    return positions;
};

const getZones = (players, numSimulations = 250) => {
    if (players.length <= 0) return null;

    let bestAssignment = { a: null, b: null };
    let bestWeightedScore = -Infinity;

    // Tracking best values for clean output
    let bestTotalScores = { a: 0, b: 0 };
    let bestScoreDiff = Infinity;
    let bestVariance = Infinity;

    // Adjustable weights
    const W_total = 5.0;    // Maximize
    const W_balance = 100.0;  // Minimize
    const W_variance = 100.0; // Minimize
    const EPSILON = 1e-6;

    for (let i = 0; i < numSimulations; i++) {
        let playersCopy = structuredClone(players);
        let teamA = { 0: [], 1: [], 2: [] };
        let teamB = { 0: [], 1: [], 2: [] };

        assignPlayersToTeams(playersCopy, teamA, teamB);

        let teamAZoneScores = [0, 0, 0];
        let teamBZoneScores = [0, 0, 0];

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
            bestAssignment = { a: teamA, b: teamB };
            bestTotalScores = { a: teamATotalScore, b: teamBTotalScore };
            bestScoreDiff = scoreDiff;
            bestVariance = totalVariance;
        }
    }

    // Log clean output
    let teamAZoneScores = [0, 0, 0];
    let teamBZoneScores = [0, 0, 0];

    populateZoneScores(bestAssignment.a, teamAZoneScores);
    populateZoneScores(bestAssignment.b, teamBZoneScores);

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

const normalizeWeights = (weights) => {
    const normalizedWeights = {};

    Object.keys(weights).forEach(zone => {
        const total = Object.values(weights[zone]).reduce((sum, val) => sum + val, 0);
        normalizedWeights[zone] = Object.fromEntries(
            Object.entries(weights[zone]).map(([key, value]) => [key, Math.fround(value / total)])
        );
    });

    return normalizedWeights;
};


const generateBalancedTeams = (players, attributeWeights) => {
    if (players.length < 2) return [[], []];

    let scoredPlayers = calculateScores(players, normalizeWeights(attributeWeights));

    // this is just for logging purposes
    // kinda interesting to see the full sorted list
    // remove when this gets optimized
    scoredPlayers.sort((a, b) => {
        // Sort the zoneScores for both players in descending order
        const sortedA = [a.zoneScores[0], a.zoneScores[1], a.zoneScores[2]].sort((x, y) => y - x);
        const sortedB = [b.zoneScores[0], b.zoneScores[1], b.zoneScores[2]].sort((x, y) => y - x);

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

    console.log(scoredPlayers);

    const teams = getZones(scoredPlayers);

    // Assign positions for both teams
    const positionsA = teams ? assignPositions(teams.a) : [];
    const positionsB = teams ? assignPositions(teams.b) : [];
    
    
    positionsA.push({ id: gkA.id, name: gkA.name, x: 0.5, y: 1.0 });
    positionsB.push({ id: gkB.id, name: gkB.name, x: 0.5, y: 1.0 });

    return { a: positionsA, b: positionsB };
};

export const autoCreateTeams = (players, attributeWeights) => {
    if (players.length < 2) throw new Error("Not enough players to form teams");
    return generateBalancedTeams(players, attributeWeights);
};
