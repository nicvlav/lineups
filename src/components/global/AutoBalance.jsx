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

const generatePositions = (team) => {
    if (team.length === 0) return [];

    if (team.length === 0) return [];

    const numPlayers = team.length;
    let positions = [];

    // First set the worst player to goalkeeper
    let goalkeeper = team.reduce((worst, p) =>
        (p.attack + p.defense + p.athleticism < worst.attack + worst.defense + worst.athleticism) ||
            (p.attack + p.defense + p.athleticism === worst.attack + worst.defense + worst.athleticism && p.defense > worst.defense) ? p : worst
        , team[0]);

    positions.push({ id: goalkeeper.id, name: goalkeeper.name, x: 0.5, y: 1.0 });

    // Sort players by overall skill (ascending: attack + defense + athleticism)
    const sortedPlayers = team.filter(p => p.id !== goalkeeper.id)
        .sort((a, b) => (a.attack + a.defense + a.athleticism) - (b.attack + b.defense + b.athleticism));


    const numOutfieldPlayers = sortedPlayers.length;
    const baseSize = Math.floor((numOutfieldPlayers - 1) / 3);
    const remainder = (numOutfieldPlayers - 1) % 3;

    // Divide the sorted players into three zones: 0 = Defense, 1 = Midfield, 2 = Attack
    let idealDistribution = { 0: baseSize, 1: baseSize + 1, 2: baseSize };
    let zones = { 0: [], 1: [], 2: [] };

    if (remainder === 1) {
        // 1 extra player, push to defense
        idealDistribution[0] += 1;
    } else if (remainder === 2) {
        // 2 extra players, push one to defense and one to midfield
        idealDistribution[0] += 1;
        idealDistribution[1] += 1;
    }

    const numFirst = Math.max(0, numOutfieldPlayers - 3);

    if (numFirst !== 0) {
        const firstPart = sortedPlayers.slice(0, numFirst).reverse();

        // Create the map for players with attack/defense difference >= 3
        const highDifferencePlayers = firstPart.filter(player => Math.abs(player.attack - player.defense) >= 3);

        // Create the map for players with attack/defense difference < 3
        const lowDifferencePlayers = firstPart.filter(player => Math.abs(player.attack - player.defense) < 3);

        highDifferencePlayers.forEach(player => {
            const { attack, defense } = player;

            const allowDefense = (zones[0].length + 1) < idealDistribution[0];
            const allowMidfield = (zones[1].length + 1) < idealDistribution[1];
            const allowAttack = (zones[2].length + 1) < idealDistribution[2];

            if (allowAttack && (attack > defense)) {
                // Assign to attack if not exceeding limit
                zones[2].push(player);
            } else if (allowDefense) {
                // Assign to defense if not exceeding limit
                zones[0].push(player);
            } else if (allowMidfield) {
                // Balanced, assign to midfield if not exceeding limit
                zones[0].push(player);
            } else {
                zones[2].push(player);
            }

        });

        // Distribute players in firstPart to zones, respecting idealDistribution limits
        lowDifferencePlayers.forEach(player => {
            const { attack, defense, athleticism } = player;

            const allowDefense = (zones[0].length + 1) < idealDistribution[0];
            const allowMidfield = (zones[1].length + 1) < idealDistribution[1];
            const allowAttack = (zones[2].length + 1) < idealDistribution[2];

            const preZoneSize = zones[0].length + zones[1].length + zones[2].length;

            // Assign players to the appropriate zone based on their skill
            if (athleticism < 4) {
                // Low athleticism — prioritize defense or attack based on other stats
                if (allowAttack && attack > defense) {
                    zones[2].push(player);
                } else if (allowDefense) {
                    zones[0].push(player);
                } else {
                    zones[1].push(player);
                }
            } else {
                // High athleticism — generally prefer midfield, but check attack vs defense
                if (allowMidfield && attack > 4 && defense > 4 && Math.abs(attack - defense) < 2) {
                    // Assign to attack if not exceeding limit
                    zones[1].push(player);
                } else if (allowAttack && attack > defense) {
                    // Assign to defense if not exceeding limit
                    zones[2].push(player);
                } else if (allowDefense) {
                    // Balanced, assign to midfield if not exceeding limit
                    zones[0].push(player);
                }
            }

            if ((zones[0].length + zones[1].length + zones[2].length) === preZoneSize) {
                if (allowMidfield) {
                    // Assign to attack if not exceeding limit
                    zones[1].push(player);
                } else if (allowAttack) {
                    // Assign to defense if not exceeding limit
                    zones[2].push(player);
                } else {
                    // Balanced, assign to midfield if not exceeding limit
                    zones[0].push(player);
                }
            }

        });

        console.log("ZONES AFTER DISTRIBUTION: ", zones);

    }

    // deal with the top 3 players
    const lastPart = numFirst ? sortedPlayers.slice(numFirst) : sortedPlayers;

    console.log("LAST: ", lastPart);

    // Distribute players in firstPart to zones, respecting idealDistribution limits
    lastPart.forEach(player => {
        const { attack, defense, athleticism } = player;

        const allowDefense = (zones[0].length) < idealDistribution[0];
        const allowMidfield = (zones[1].length) < idealDistribution[1];
        const allowAttack = (zones[2].length) < idealDistribution[2];

        const preZoneSize = zones[0].length + zones[1].length + zones[2].length;

        // initial ideal choices
        if (allowMidfield && athleticism > 8) {
            zones[1].push(player);
        } else if (allowDefense && defense > 8) {
            zones[0].push(player);
        } else if (allowAttack && attack > 8) {
            zones[2].push(player);
        }

        // fallback assignments
        else if (allowMidfield) {
            zones[1].push(player);
        } else if (allowAttack) {
            zones[2].push(player);
        } else {
            zones[0].push(player);
        }

    });

    // Generate positions for each player in the assigned zones
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
    if (players.length < 2) throw new Error("Not enough players to form teams");
    const [teamA, teamB] = generateBalancedTeams(players, attributeWeights);

    return [generatePositions(teamA), generatePositions(teamB)];
};
