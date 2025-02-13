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

    const numPlayers = team.length;
    let positions = [];

    // first set worst player to goalkeeper
    let goalkeeper = team.reduce((worst, p) => 
        (p.attack + p.defense + p.athleticism < worst.attack + worst.defense + worst.athleticism) ||
        (p.attack + p.defense + p.athleticism === worst.attack + worst.defense + worst.athleticism && p.defense > worst.defense) ? p : worst
    , team[0]);
    
    positions.push({ id: goalkeeper.id, name: goalkeeper.name, x: 0.5, y: 1.0 });
    
    let outfieldPlayers = team.filter(p => p.id !== goalkeeper.id);
    
    // get zones - low num players has only 2 -  attack + defence, 
    // high num players has 3 zones - attack, midfield, defence
    const numZones = numPlayers < 6 ? 2 : 3;
    const basePlayersPerZone = Math.floor((numPlayers - 1) / numZones);
    const extraPlayers = (numPlayers - 1) % numZones;
    let zoneLimits = { 0: basePlayersPerZone, 1: basePlayersPerZone, 2: basePlayersPerZone };
    
    // add an extra player to each zone for all remainers
    for (let i = 0; i < extraPlayers; i++) {
        zoneLimits[i]++;
    }

    // sort into main zones based on players' general strengths
    // initially split players into balanced -> midfield, and the rest into outfield
    let zones = { 0: [], 1: [], 2: [] }, assignedPlayers = new Set();
    let sortedOutfield = [...outfieldPlayers].sort((a, b) => Math.abs(b.attack - b.defense) - Math.abs(a.attack - a.defense));
    let midfieldPriority = [...outfieldPlayers].sort((a, b) => (b.athleticism + (b.attack + b.defense) / 2) - (a.athleticism + (a.attack + a.defense) / 2));

    // outfield players are generally the ones with less balanced stats
    // might change this a little since this runs a risk of defensive players being put in attack
    sortedOutfield.forEach(player => {
        if (Math.abs(player.attack - player.defense) > 3 && !assignedPlayers.has(player.id)) {
            if (player.attack > player.defense && zones[2].length < zoneLimits[2]) {
                zones[2].push(player);
                assignedPlayers.add(player.id);
            } else if (player.defense > player.attack && zones[0].length < zoneLimits[0]) {
                zones[0].push(player);
                assignedPlayers.add(player.id);
            }
        }
    });
    
    // midifielders dont get too much special treatment here, they should be the most balanced
    midfieldPriority.forEach(player => {
        if (!assignedPlayers.has(player.id) && zones[1].length < zoneLimits[1]) {
            zones[1].push(player);
            assignedPlayers.add(player.id);
        }
    });

    // double check to ensure all players are always added
    let remainingPlayers = outfieldPlayers.filter(p => !assignedPlayers.has(p.id));
    
    for (let zone = 0; zone < numZones; zone++) {
        while (zones[zone].length < zoneLimits[zone] && remainingPlayers.length) {
            let player = remainingPlayers.shift();
            zones[zone].push(player);
            assignedPlayers.add(player.id);
        }
    }
    
    for (let player of remainingPlayers) {
        for (let zone = 0; zone < numZones; zone++) {
            if (zones[zone].length < zoneLimits[zone]) {
                zones[zone].push(player);
                assignedPlayers.add(player.id);
                break;
            }
        }
    }
    
    // final return is all players combined to one list
    Object.entries(zones).forEach(([zone, players]) => {
        let y = 1.0 - ((parseInt(zone) + 1) / (numZones + 1));
        let numPlayersInZone = players.length;
        let xSpacing = 0.4 / Math.max(numPlayersInZone - 1, 1);

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
