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
        // get scores for each zone - should make this dynamically grow for number of attributes...
        const defenseScore =
            player.stats[0] * zoneWeights[0][0] +
            player.stats[1] * zoneWeights[0][1] +
            player.stats[2] * zoneWeights[0][2] +
            player.stats[3] * zoneWeights[0][3] +
            player.stats[4] * zoneWeights[0][4] +
            player.stats[5] * zoneWeights[0][5];

        const attackScore =
            player.stats[0] * zoneWeights[1][0] +
            player.stats[1] * zoneWeights[1][1] +
            player.stats[2] * zoneWeights[1][2] +
            player.stats[3] * zoneWeights[1][3] +
            player.stats[4] * zoneWeights[1][4] +
            player.stats[5] * zoneWeights[1][5];

        const midfieldScore =
            player.stats[0] * zoneWeights[2][0] +
            player.stats[1] * zoneWeights[2][1] +
            player.stats[2] * zoneWeights[2][2] +
            player.stats[3] * zoneWeights[2][3] +
            player.stats[4] * zoneWeights[2][4] +
            player.stats[5] * zoneWeights[2][5];

        return {
            ...player,
            zoneFit: [defenseScore, attackScore, midfieldScore]
        };
    });
};

const assignPlayersToTeams = (players: ScoredPlayer[], teamA: TeamZones, teamB: TeamZones) => {
    let teamATotalScore = 0;
    let teamBTotalScore = 0;

    let teamAZoneScores = [0, 0, 0];
    let teamBZoneScores = [0, 0, 0];

    // Dynamic weighting ratio
    const rand = Math.random();

    // this determines how important "specialization" is to a zone
    // specialization means the impact of this zone vs other zones
    // for example an attack player with low defense and midfield stats
    // makes them highly specialized in the attack zone
    // higher specialization ratios mean more specialization weighting
    const specializationRatios = [rand * 0.4 + 0.5, rand * 0.4 + 0.0, rand * 0.4 + 0.4];

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

const getZones = (players: ScoredPlayer[], numSimulations: number = 500) => {
    let bestAssignment: TeamResults = {
        teamA: [[], [], []],
        teamB: [[], [], []]
    };
    let bestWeightedScore = -Infinity;

    // Tracking best values for output clarity
    let bestTotalScores = { a: 0, b: 0 };
    let bestBalanceDiff = Infinity;
    let bestZoneScore = 0;

    // Adjustable weights (total sums to 1)
    const W_quality = 0.4; // Normalize overall player quality
    const W_balance = 0.4; // Normalize team balance
    const W_zonal = 0.2;   // Normalize zonal variance

    for (let i = 0; i < numSimulations; i++) {
        let playersCopy = structuredClone(players);
        let teamA: TeamZones = [[], [], []];
        let teamB: TeamZones = [[], [], []];

        // Use the provided assignment function
        assignPlayersToTeams(playersCopy, teamA, teamB);

        // Calculate zone scores for both teams
        let teamAZoneScores: ZoneScores = [0, 0, 0];
        let teamBZoneScores: ZoneScores = [0, 0, 0];
        populateZoneScores(teamA, teamAZoneScores);
        populateZoneScores(teamB, teamBZoneScores);

        // Count players per team overall
        let teamAPlayers = teamA.flat().length;
        let teamBPlayers = teamB.flat().length;
        // let totalPlayers = teamAPlayers + teamBPlayers;

        // Maximum possible scores (each player can score 100)
        let maxTeamAScore = teamAPlayers * 100;
        let maxTeamBScore = teamBPlayers * 100;
        let maxTotalScore = maxTeamAScore + maxTeamBScore;

        // Overall team total scores
        let teamATotalScore = teamAZoneScores.reduce((sum, val) => sum + val, 0);
        let teamBTotalScore = teamBZoneScores.reduce((sum, val) => sum + val, 0);
        let totalScore = teamATotalScore + teamBTotalScore;

        // 1. Normalize overall quality (average player quality)
        let normalizedQuality = totalScore / maxTotalScore; // 1 means every player scored 100

        // 2. Normalize team balance
        let diff = Math.abs(teamATotalScore - teamBTotalScore);
        // Maximum possible difference is if the larger team scores max and the smaller scores 0.
        let maxPossibleDiff = Math.max(teamAPlayers, teamBPlayers) * 100;
        let normalizedBalance = 1 - (diff / maxPossibleDiff); // 1 is perfect balance

        // 3. Normalize zonal variance
        // For each zone, assume worst-case acceptable variance = (players_in_zone * 50)
        let zoneScoresNormalized: number[] = [];
        for (let zone = 0; zone < 3; zone++) {
            let zonePlayers = teamA[zone].length + teamB[zone].length;
            // If there are no players in a zone, treat it as perfectly balanced
            if (zonePlayers === 0) {
                zoneScoresNormalized.push(1);
                continue;
            }
            let zoneDiff = Math.abs(teamAZoneScores[zone] - teamBZoneScores[zone]);
            let worstAcceptable = zonePlayers * 50;
            let normZone = 1 - (zoneDiff / worstAcceptable);
            // Clamp the value between 0 and 1
            normZone = Math.max(0, Math.min(1, normZone));
            zoneScoresNormalized.push(normZone);
        }
        // Overall zonal score is the average of the three zones
        let normalizedZonal = zoneScoresNormalized.reduce((a, b) => a + b, 0) / 3;

        // Compute weighted overall score
        let weightedScore =
            W_quality * normalizedQuality +
            W_balance * normalizedBalance +
            W_zonal * normalizedZonal;

        // Choose best assignment based on weighted score
        if (weightedScore > bestWeightedScore) {
            bestWeightedScore = weightedScore;
            bestAssignment = { teamA, teamB };
            bestTotalScores = { a: teamATotalScore, b: teamBTotalScore };
            bestBalanceDiff = diff;
            bestZoneScore = normalizedZonal;
        }
    }

    // Log final optimized team metrics
    let teamAZoneScores: ZoneScores = [0, 0, 0];
    let teamBZoneScores: ZoneScores = [0, 0, 0];
    populateZoneScores(bestAssignment.teamA, teamAZoneScores);
    populateZoneScores(bestAssignment.teamB, teamBZoneScores);

    console.log("===== Final Optimized Teams =====");
    console.log("Team A Zones (Defense, Midfield, Attack):", teamAZoneScores);
    console.log("Team B Zones (Defense, Midfield, Attack):", teamBZoneScores);
    console.log("==================================");
    console.log("Total Scores → Team A:", bestTotalScores.a, "Team B:", bestTotalScores.b);
    console.log("Team Balance Difference (Lower is better):", bestBalanceDiff);
    console.log("Overall Zonal Score (0 to 1, 1 is best balance):", bestZoneScore);
    console.log("Weighted Score (0 to 1):", bestWeightedScore);
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
