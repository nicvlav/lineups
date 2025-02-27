const generateBalancedTeams = (players, weights) => {
    if (players.length < 2) return [[], []];

    let scoredPlayers = players.map(p => ({
        ...p,
        score: p.attack * weights.attack + p.defense * weights.defense + p.athleticism * weights.athleticism
    }));

    scoredPlayers.sort((a, b) => b.score - a.score);

    for (let i = 0; i < scoredPlayers.length - 1; i++) {
        if (Math.abs(scoredPlayers[i].score - scoredPlayers[i + 1].score) < 0.1 * scoredPlayers[i].score) {
            if (Math.random() < 0.3) {
                [scoredPlayers[i], scoredPlayers[i + 1]] = [scoredPlayers[i + 1], scoredPlayers[i]];
            }
        }
    }

    let teamA = [], teamB = [], sumA = 0, sumB = 0;
    const halfSize = Math.floor(players.length / 2);

    scoredPlayers.forEach(p => {
        if (teamA.length < halfSize && (sumA <= sumB || teamB.length >= halfSize)) {
            teamA.push(p);
            sumA += p.score;
        } else {
            teamB.push(p);
            sumB += p.score;
        }
    });

    console.log("Team A Weighted Score:", sumA);
    console.log("Team B Weighted Score:", sumB);

    return [teamA, teamB];
};

function getIdealDistribution(numPlayers) {
    const baseSize = Math.floor((numPlayers - 1) / 3);
    const remainder = (numPlayers - 1) % 3;

    // Initial 1-2-1 pattern
    let idealDistribution = { 0: baseSize, 1: baseSize + 1, 2: baseSize };

    if (remainder === 1) {
        // 1 extra player, push to defense
        idealDistribution[0] += 1;
    } else if (remainder === 2) {
        // 2 extra players, push one to defense and one to midfield
        idealDistribution[0] += 1;
        idealDistribution[1] += 1;
    }
    return idealDistribution;
}

const generatePositions = (players) => {
    const numTopPlayers = 4;

    if (players.length < numTopPlayers) return [];

    let positions = [];

    // Assign the worst goalkeeper first
    let goalkeeper = players.reduce((worst, p) => {
        let worstScore = worst.attack + worst.defense + worst.athleticism;
        let currentScore = p.attack + p.defense + p.athleticism;

        return (currentScore < worstScore) ||
            (currentScore === worstScore && p.defense > worst.defense) ? p : worst;
    }, players[0]);

    positions.push({ id: goalkeeper.id, name: goalkeeper.name, x: 0.5, y: 1.0 });

    // Sort players by total attribute sum (ascending)
    let sortedPlayers = [...players].sort((a, b) =>
        (a.attack + a.defense + a.athleticism) - (b.attack + b.defense + b.athleticism)
    );

    sortedPlayers = sortedPlayers.filter(p => p.id !== goalkeeper.id);
    const numPlayers = sortedPlayers.length;


    let worstCount = Math.max(numPlayers - numTopPlayers, 0);
    let topPlayers = sortedPlayers.slice(worstCount); // Always the top 4
    let zones = { 0: [], 1: [], 2: [] };

    if (worstCount) {
        let worstPlayers = sortedPlayers.slice(0, worstCount);

        // Define weights for each zone
        const zoneWeights = {
            0: { attack: 0.1, defense: 0.6, athleticism: 0.3 }, // Defense
            1: { attack: 0.3, defense: 0.25, athleticism: 0.45 }, // Midfield
            2: { attack: 0.65, defense: 0.05, athleticism: 0.3 } // Attack
        };

        // Assign scores to the worst players based on zone fit
        worstPlayers.forEach(player => {
            player.zoneScores = Object.entries(zoneWeights).map(([zone, weights]) => ({
                zone: parseInt(zone),
                score: (player.attack * weights.attack) + (player.defense * weights.defense) + (player.athleticism * weights.athleticism)
            }));
        });

        // Sort worst players by best zone fit
        worstPlayers.sort((a, b) => Math.max(...b.zoneScores.map(z => z.score)) - Math.max(...a.zoneScores.map(z => z.score)));

        // Calculate new ideal distribution (based on full player count)
        let idealDistribution = getIdealDistribution(numPlayers)

        if (idealDistribution[0] > 0) idealDistribution[0] -= 1; // Remove 1 defender
        if (idealDistribution[1] > 1) idealDistribution[1] -= 2; // Remove 2 midfielders
        if (idealDistribution[2] > 0) idealDistribution[2] -= 1; // Remove 1 attacker

        // Assign worst players greedily while keeping zone balance
        worstPlayers.forEach(player => {
            player.zoneScores.sort((a, b) => b.score - a.score);
            for (let { zone } of player.zoneScores) {
                if (zones[zone].length < idealDistribution[zone]) {
                    zones[zone].push(player);
                    break;
                }
            }
        });
    }


    // 1. Sort by overall impact (higher weight on attack/defense)
    topPlayers.sort((a, b) => (b.attack + b.defense + 0.5 * b.athleticism) - (a.attack + a.defense + 0.5 * a.athleticism));

    // 2. Identify the most well-rounded player (closest to balanced)
    let balancedPlayer = topPlayers.reduce((best, p) => {
        let diff = Math.abs(p.attack - p.defense);
        let bestDiff = Math.abs(best.attack - best.defense);
        return diff < bestDiff ? p : best;
    }, topPlayers[0]);

    topPlayers = topPlayers.filter(p => p.id !== balancedPlayer.id);

    // 3. Determine best defender (highest defense, with priority to pure defenders)
    let bestDefender = topPlayers.reduce((best, p) => {
        if (p.defense > best.defense) return p;
        if (p.defense === best.defense && (p.defense - p.attack) > (best.defense - best.attack)) return p;
        return best;
    }, topPlayers[0]);

    topPlayers = topPlayers.filter(p => p.id !== bestDefender.id);

    // 4. Determine best attacker (highest attack, with priority to pure attackers)
    let bestAttacker = topPlayers.reduce((best, p) => {
        if (p.attack > best.attack) return p;
        if (p.attack === best.attack && (p.attack - p.defense) > (best.attack - best.defense)) return p;
        return best;
    }, topPlayers[0]);

    topPlayers = topPlayers.filter(p => p.id !== bestAttacker.id);

    // 5. The last remaining player goes to midfield
    let lastMidfielder = topPlayers[0];

    // Assign players to zones
    zones[0].push(bestDefender); // Defense
    zones[1].push(balancedPlayer); // Midfield
    zones[1].push(lastMidfielder); // Midfield
    zones[2].push(bestAttacker); // Attack


    // Position players within each zone
    Object.entries(zones).forEach(([zone, players]) => {
        let numPlayersInZone = players.length;
        let maxSpread = 0.4; // Max width for players
        let y = 1.0 - ((parseInt(zone) + 1) / 4);
    
        // Sort players based on zone priority (Best → Worst)


        if (zone == 0) {
            players.sort((a, b) => ((b.attack * 0.3) + (b.athleticism * 0.4) + b.defense) - ((a.attack * 0.3) +  (a.athleticism * 0.4) + a.defense)); // Defense priority
        } else if (zone == 2) {
            players.sort((a, b) => (b.attack - a.attack)); // Attack priority
        } else {
            players.sort((a, b) => ((b.attack * 0.6) + (b.athleticism * 0.4) + (b.defense * 0.6)) - ((a.attack * 0.6) +  (a.athleticism * 0.4) + (a.defense * 0.6))); // Midfield balance
        }
    
        let positionsForZone = [];
    
        if (numPlayersInZone <= 2) {
            // Standard symmetry for 3 or fewer players
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


export const autoCreateTeams = (players, attributeWeights) => {
    if (players.length < 8) throw new Error("Not enough players to form teams");
    const [teamA, teamB] = generateBalancedTeams(players, attributeWeights);


    return { a: generatePositions(teamA), b: generatePositions(teamB) };
};
