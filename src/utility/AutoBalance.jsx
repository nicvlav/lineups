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
    const ATTACK_DEFENSE_WEIGHT = 2.0; // Weight factor for attack vs. defense

    return players.map(player => {
        let zoneScores = {
            0: player.attack * zoneWeights[0].attack + player.defense * zoneWeights[0].defense + player.athleticism * zoneWeights[0].athleticism,
            1: player.attack * zoneWeights[1].attack + player.defense * zoneWeights[1].defense + player.athleticism * zoneWeights[1].athleticism,
            2: player.attack * zoneWeights[2].attack + player.defense * zoneWeights[2].defense + player.athleticism * zoneWeights[2].athleticism
        };

        let weightedScores = {
            0: zoneScores[0] + ATTACK_DEFENSE_WEIGHT * Math.max(player.defense - player.attack, 0), // Defense
            2: zoneScores[2] + ATTACK_DEFENSE_WEIGHT * Math.max(player.attack - player.defense, 0)  // Attack
        };

        return { ...player, zoneScores, weightedScores };
    });
};


const assignStarsToTeams = (stars, teamA, teamB, ideal) => {
    let teamATotalScore = 0;
    let teamBTotalScore = 0;

    // Step 2: Sort & Assign Players to Zones
    const assignPlayersToZone = (zone, weightKey, count, forceFirstPick, loadIntoAFirst) => {
        if (zone === 1) {
            // Sort by midfield zone score
            stars.sort((a, b) => b.zoneScores[1] - a.zoneScores[1]);
        } else {
            // Sort by weighted attack/defense score
            stars.sort((a, b) => b.weightedScores[weightKey] - a.weightedScores[weightKey]);
        }

        if (forceFirstPick) {
            let player = stars.shift();

            if (loadIntoAFirst) {
                teamA[zone].push(player);
                teamATotalScore += player.zoneScores[zone];
            } else {
                teamB[zone].push(player);
                teamBTotalScore += player.zoneScores[zone];
            }
        }

        for (let i = forceFirstPick ? 1 : 0; i < count * 2; i++) {
            let player = stars.shift();

            if (teamATotalScore <= teamBTotalScore) {
                teamA[zone].push(player);
                teamATotalScore += player.zoneScores[zone];
            } else {
                teamB[zone].push(player);
                teamBTotalScore += player.zoneScores[zone];
            }
        }
    };

    // randomize the first team used
    let loadIntoAFirst = Math.random() < 0.5;

    // // Assign players to each zone using `ideal` structure
    if (ideal.defense > 0) assignPlayersToZone(0, 0, ideal.defense, true, loadIntoAFirst); // Defense
    if (ideal.attack > 0) assignPlayersToZone(2, 2, ideal.attack, true, !loadIntoAFirst); // Attack
    if (ideal.midfield > 0) assignPlayersToZone(1, 1, ideal.midfield, false, true); // Midfield

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

const assignPlayersToTeams = (specialistsAttack, specialistsDefense, generalists, teamA, teamB) => {
    let teamAZoneScores = [0, 0, 0];
    let teamBZoneScores = [0, 0, 0];

    populateZoneScores(teamA, teamAZoneScores);
    populateZoneScores(teamB, teamBZoneScores);

    // Calculate total scores for both teams
    let teamATotalScore = teamAZoneScores.reduce((sum, value) => sum + value, 0);
    let teamBTotalScore = teamBZoneScores.reduce((sum, value) => sum + value, 0);

    // Assign players based on zone balance
    const assignPlayersToZone = (players, zone) => {
        players.sort((a, b) => b.zoneScores[zone] - a.zoneScores[zone]);

        applyRandom(players, zone);

        for (let player of players) {
            if (teamAZoneScores[zone] <= teamBZoneScores[zone] && teamATotalScore <= teamBTotalScore) {
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

    // Assign players by zone
    assignPlayersToZone(specialistsDefense, 0);
    assignPlayersToZone(specialistsAttack, 2);
    assignPlayersToZone(generalists, 1);

    // console.log("===== Team A Average Scores (Defense, Midfield, Attack) ======", teamAZoneScores);
    // console.log("===== Team B Average Scores (Defense, Midfield, Attack) ======", teamBZoneScores);

    return { teamA, teamB };
};

const assignPositions = (team) => {
    let positions = [];

    Object.entries(team).forEach(([zone, players]) => {
        let numPlayersInZone = players.length;
        let maxSpread = 0.4; // Max width for players
        let y = 1.0 - ((parseInt(zone) + 1) / 4);

        // Sort players based on zone priority (Best → Worst)
        if (zone == 0) {
            players.sort((a, b) => ((b.attack * 0.3) + (b.athleticism * 0.4) + b.defense) - ((a.attack * 0.3) + (a.athleticism * 0.4) + a.defense)); // Defense priority
        } else if (zone == 2) {
            players.sort((a, b) => (b.attack - a.attack)); // Attack priority
        } else {
            players.sort((a, b) => ((b.attack * 0.6) + (b.athleticism * 0.4) + (b.defense * 0.6)) - ((a.attack * 0.6) + (a.athleticism * 0.4) + (a.defense * 0.6))); // Midfield balance
        }

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

const adjustSpecialists = (specialists, generalists, totalRequired, primaryZone, secondaryZone) => {
    if (specialists.length < totalRequired) {
        let needed = totalRequired - specialists.length;

        // Sort generalists by best fit for the primary zone
        // generalists.sort((a, b) => b.zoneScores[primaryZone] - a.zoneScores[primaryZone]);

        generalists.sort((a, b) => b.zoneScores[primaryZone] - a.zoneScores[primaryZone]);
        applyRandom(generalists, primaryZone);

        while (needed > 0 && generalists.length > 0) {
            specialists.push(generalists.shift());
            needed--;
        }
    } else if (specialists.length > totalRequired) {
        let toMove = specialists.length - totalRequired;

        // Sort specialists by best fit for the secondary zone
        specialists.sort((a, b) => b.zoneScores[secondaryZone] - a.zoneScores[secondaryZone]);
        applyRandom(specialists, secondaryZone);

        while (toMove > 0 && specialists.length > 0) {
            generalists.push(specialists.pop());
            toMove--;
        }
    }
};

const monteCarloTeamAssignment = (generalists, specialistsAttack, specialistsDefense, totalRequiredAttackers, totalRequiredDefenders, stars, star_distribution, numSimulations = 100) => {
    let bestAssignment = { a: null, b: null };
    let bestScoreDiff = Infinity;
    let bestScores = { a: 0, b: 0 };


    for (let i = 0; i < numSimulations; i++) {
        let midfielders = structuredClone(generalists);
        let starsCopy = structuredClone(stars);
        let attackers = structuredClone(specialistsAttack);
        let defenders = structuredClone(specialistsDefense);
        let teamA = { 0: [], 1: [], 2: [] };
        let teamB = { 0: [], 1: [], 2: [] };

        adjustSpecialists(defenders, midfielders, totalRequiredDefenders, 0, 1);
        adjustSpecialists(attackers, midfielders, totalRequiredAttackers, 2, 1);

        assignStarsToTeams(starsCopy, teamA, teamB, star_distribution);

        // Modify tempTeamA and tempTeamB in place by calling assignPlayersToTeams
        assignPlayersToTeams(
            attackers,
            defenders,
            midfielders,
            teamA,
            teamB
        );

        let teamAZoneScores = [0, 0, 0];
        let teamBZoneScores = [0, 0, 0];

        populateZoneScores(teamA, teamAZoneScores);
        populateZoneScores(teamB, teamBZoneScores);

        // Calculate total scores for both teams
        let teamATotalScore = teamAZoneScores.reduce((sum, value) => sum + value, 0);
        let teamBTotalScore = teamBZoneScores.reduce((sum, value) => sum + value, 0);

        let scoreDiff = Math.abs(teamATotalScore - teamBTotalScore);
        let totalScore = teamATotalScore + teamBTotalScore;
        let bestTotalScore = bestScores.a + bestScores.b;

        // Define a leeway factor: If totalScore is much better, allow a slightly worse balance
        let totalImprovementFactor = totalScore / (bestTotalScore || 1); // Avoid division by zero
        let dynamicLeeway = bestScoreDiff * (1 + 0.1 * totalImprovementFactor); // More total score allows for a slightly higher diff

        // Decision logic: Favor higher total scores while keeping reasonable balance
        if (totalScore > bestTotalScore || (scoreDiff <= dynamicLeeway && totalScore >= bestTotalScore)) {
            bestAssignment = { a: teamA, b: teamB };
            bestScores = { a: teamATotalScore, b: teamBTotalScore };
            bestScoreDiff = scoreDiff;
        }

    }

    console.log("===== Total Scores For Teams ======", bestScores);
    console.log("===== Score Difference ======", bestScoreDiff);

    return bestAssignment;
};

const getZones = (scoredPlayers) => {
    let stars = [], generalists = [], specialistsAttack = [], specialistsDefense = [];

    // Categorize players
    scoredPlayers.forEach(p => {
        if ((p.attack >= 9 || p.defense >= 9)) { // && p.athleticism >= 7) {
            stars.push(p);
        } else if (p.attack - p.defense >= 2) {
            specialistsAttack.push(p);
        } else if (p.defense - p.attack >= 2) {
            specialistsDefense.push(p);
        } else {
            generalists.push(p);
        }
    });

    // If stars count is odd, adjust
    if (stars.length % 2 === 1) {
        if (generalists.length > 0) {
            // Promote best generalist to stars
            generalists.sort((a, b) => (b.attack + b.defense + b.athleticism) - (a.attack + a.defense + a.athleticism));
            let promotedGeneralist = generalists.shift();
            stars.push(promotedGeneralist);
        } else if (stars.length > 1) {
            // No generalists, move weakest star to generalists
            stars.sort((a, b) => (a.attack + a.defense + a.athleticism) - (b.attack + b.defense + b.athleticism));
            let demotedStar = stars.shift();
            generalists.push(demotedStar);
        }
    }

    // Total number of players for each team
    // if total players is odd, the extra player will always go to midfield
    const numTeamPlayers = Math.floor(scoredPlayers.length / 2);

    // Get ideal distributions for all players
    let idealDistribution = getIdealDistribution(numTeamPlayers, true);

    // Get ideal distributions for stars
    let numStars = Math.floor(stars.length / 2);
    let star_distribution = getIdealDistribution(numStars, false);

    const totalRequiredAttackers = (idealDistribution.attack + idealDistribution.attack) - (star_distribution.attack * 2);
    const totalRequiredDefenders = (idealDistribution.defense + idealDistribution.defense) - (star_distribution.defense * 2);

    console.log("===== stars ======", generalists);
    console.log("===== stars ======", stars);

    return monteCarloTeamAssignment(generalists, specialistsAttack, specialistsDefense, totalRequiredAttackers, totalRequiredDefenders, stars, star_distribution)
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

    scoredPlayers.sort((a, b) =>
        Math.max(b.zoneScores[0], b.zoneScores[1], b.zoneScores[2]) -
        Math.max(a.zoneScores[0], a.zoneScores[1], a.zoneScores[2])
    );

    console.log("===== Ranked Players With Zone Ratings (Best to Worst) =====", scoredPlayers);

    const numPlayers = players.length;

    const gkA = scoredPlayers[numPlayers - 1];
    const gkB = scoredPlayers[numPlayers - 2];

    scoredPlayers = scoredPlayers.slice(0, numPlayers - 2);

    const teams = getZones(scoredPlayers, gkA.score, gkB.score);

    // Assign positions for both teams
    const positionsA = assignPositions(teams.a);
    const positionsB = assignPositions(teams.b);

    positionsA.push({ id: gkA.id, name: gkA.name, x: 0.5, y: 1.0 });
    positionsB.push({ id: gkB.id, name: gkB.name, x: 0.5, y: 1.0 });

    return { a: positionsA, b: positionsB };
};

export const autoCreateTeams = (players, attributeWeights) => {
    if (players.length < 8) throw new Error("Not enough players to form teams");
    return generateBalancedTeams(players, attributeWeights);
};
