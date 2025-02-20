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

    console.log("sortedPlayers", sortedPlayers);

  
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

        console.log("ideal dist pre", idealDistribution);

        if (idealDistribution[0] > 0) idealDistribution[0] -= 1; // Remove 1 defender
        if (idealDistribution[1] > 1) idealDistribution[1] -= 2; // Remove 2 midfielders
        if (idealDistribution[2] > 0) idealDistribution[2] -= 1; // Remove 1 attacker

        console.log("ideal dist", idealDistribution);
        console.log("worstPlayers", worstPlayers);

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

        console.log("Added so far after worst", zones);
    }


    console.log("topPlayers", topPlayers);

    // Determine the best attacker tiebreaker on athleticism
    let bestAttacker = topPlayers.reduce((best, p) => {
        if (p.attack > best.attack) return p;
        if (p.attack === best.attack && (p.defense < best.defense || p.athleticism > best.athleticism)) return p;
        return best;
    }, topPlayers[0]);

    topPlayers = topPlayers.filter(p => p.id !== bestAttacker.id);

    // Determine the best defender with a with a tiebreaker on lower defense 
    let bestDefender = topPlayers.reduce((best, p) => {
        if (p.defense > best.defense) return p;
        if (p.defense === best.defense && (p.defense - p.attack) > (best.defense - best.attack)) return p;
        return best;
    }, topPlayers[0]);

    // Remove the chosen best defender and attacker from topPlayers
    topPlayers = topPlayers.filter(p => p.id !== bestDefender.id);

    // Assign the best defender and attacker
    zones[0].push(bestDefender); // Defense
    zones[2].push(bestAttacker); // Attack

    // Assign the remaining two to midfield
    topPlayers.forEach(player => zones[1].push(player)); // Both go to midfield

    console.log("final zones", zones);

    // Position players within each zone
    Object.entries(zones).forEach(([zone, players]) => {
        let numPlayersInZone = players.length;
        let xSpacing = 0.4 / Math.max(numPlayersInZone - 1, 1);
        let y = 1.0 - ((parseInt(zone) + 1) / 4);

        players.forEach((player, i) => {
            let x = 0.5 + (i - (numPlayersInZone - 1) / 2) * xSpacing;
            positions.push({ id: player.id, name: player.name, x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)) });
        });
    });

    return positions;
};


export const autoCreateTeams = (players, attributeWeights) => {
    if (players.length < 8) throw new Error("Not enough players to form teams");
    const [teamA, teamB] = generateBalancedTeams(players, attributeWeights);

    return { a: generatePositions(teamA), b: generatePositions(teamB)};
};
