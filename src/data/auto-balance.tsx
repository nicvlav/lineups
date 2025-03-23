import { Player } from "@/data/player-types";
import {
    Weighting,
    ZoneScores,
    emptyZoneScores,
    defaultZoneWeights,
    formationTemplates,
    ScoredPlayer,
    TeamZones,
    emptyTeamZones,
    PositionWeighting,
    weightingShortLabels,
    TeamResults
} from "@/data/balance-types";

const getIdealDistribution = (numPlayers: number) => {
    const formations = formationTemplates[numPlayers];

    if (!formations || formations.length === 0) throw new Error("Not enough players to form teams");

    const numTemplates = formations.length;
    const index = Math.round(Math.random() * (numTemplates - 1));

    return structuredClone(formations[index]);
}

const calculateScores = (players: Player[], zoneWeights: Weighting): ScoredPlayer[] => {
    return players.map(player => {

        const zoneFit: ZoneScores = structuredClone(emptyZoneScores);

        zoneWeights.forEach((zoneArray, zone) => {
            zoneArray.forEach((positionObject, position) => {
                // dot product
                const score = player.stats.reduce((sum, statValue, index) => {
                    return sum + statValue * positionObject.weighting[index];
                }, 0);

                zoneFit[zone][position] = score;
            });
        });

        return { ...player, zoneFit };
    });
};

const isEmptyFormation = (formation: ZoneScores, zone: number) =>
    formation[zone].every(position => position <= 0);


const getBestAndSecondBestStats = (zoneFit: ZoneScores) => {
    const sortedStats = zoneFit.flat().sort((x, y) => y - x); // Sort descending
    const best = sortedStats[0];
    const secondBest = sortedStats[1] || 0;
    return { best, secondBest };
};

const sortBest = (players: ScoredPlayer[], zone: number, position: number, randomSeed: number) => {
    // const specializationRatios = [randomSeed * 0.4 + 0.5, randomSeed * 0.4 + 0.0, randomSeed * 0.4 + 0.4];

    // Pick the best available player from this zone
    const ratio = randomSeed * 0.4 + 0.5; //specializationRatios[zone];

    // Sort player pool by specialization in the zone
    players.sort((a, b) => {
        const aStats = getBestAndSecondBestStats(a.zoneFit);
        const bStats = getBestAndSecondBestStats(b.zoneFit);

        let specializationScoreA = 0;
        let specializationScoreB = 0;

        if (a.zoneFit[zone][position] === aStats.best) {
            specializationScoreA = a.zoneFit[zone][position] / (aStats.secondBest || 1);
        } else {
            specializationScoreA = a.zoneFit[zone][position] / (aStats.secondBest || 1);
        }

        if (b.zoneFit[zone][position] === bStats.best) {
            specializationScoreB = b.zoneFit[zone][position] / (bStats.secondBest || 1);
        } else {
            specializationScoreB = b.zoneFit[zone][position] / (bStats.secondBest || 1);
        }

        return (specializationScoreB * ratio * b.zoneFit[zone][position] - specializationScoreA * ratio * a.zoneFit[zone][position]);
    });
};

const sortWorst = (players: ScoredPlayer[], _: number, __: number, ___: number) => {
    // Sort player pool by specialization in the zone
    players.sort((a, b) => {
        const aStats = getBestAndSecondBestStats(a.zoneFit);
        const bStats = getBestAndSecondBestStats(b.zoneFit);

        return (aStats.best - bStats.best);
    });
};

const assignPlayersToTeams = (players: ScoredPlayer[]) => {
    let teamA: TeamZones = structuredClone(emptyTeamZones);
    let teamB: TeamZones = structuredClone(emptyTeamZones);

    let teamATotalScore = 0;
    let teamBTotalScore = 0;

    let teamAZoneScores = [0, 0, 0, 0];
    let teamBZoneScores = [0, 0, 0, 0];

    // // Dynamic weighting ratio
    const rand = Math.random();

    const addPlayerAtPos = (dist: ZoneScores, zone: number, position: number, isTeamA: boolean, sortType: (players: ScoredPlayer[], zone: number, position: number, rand: number) => void) => {
        if (dist[zone][position] <= 0) return false;

        sortType(players, zone, position, rand);

        let player = players.shift();

        if (!player) return false;

        // Move one player to the high-priority template
        dist[zone][position] -= 1;

        if (isTeamA) {
            teamAZoneScores[zone] += player.zoneFit[zone][position];
            teamATotalScore += player.zoneFit[zone][position];
            teamA[zone][position].push({ ...player, generatedPositionInfo: defaultZoneWeights[zone][position] });
        } else {
            teamBZoneScores[zone] += player.zoneFit[zone][position];
            teamBTotalScore += player.zoneFit[zone][position];
            teamB[zone][position].push({ ...player, generatedPositionInfo: defaultZoneWeights[zone][position] });
        }

        return true;

    };

    const addPlayer = (dist: ZoneScores, zone: number, isTeamA: boolean) => {
        const formationZone = dist[zone];
        const weightingZone = defaultZoneWeights[zone];

        // Sort positions by priorityStat (higher is better), breaking ties with count and index
        const sortedPositions = formationZone
            .map((count, positionIndex) => ({
                count,
                positionIndex,
                priority: weightingZone[positionIndex].priorityStat
            }))
            .filter(pos => pos.count > 0) // Ignore empty positions
            .sort((a, b) =>
                b.priority - a.priority || // Higher priority first
                b.count - a.count || // More players in that position
                a.positionIndex - b.positionIndex // Lower index if still tied
            );

        if (sortedPositions.length < 0 || !sortedPositions[0]) return false;

        return addPlayerAtPos(dist, zone, sortedPositions[0].positionIndex, isTeamA, sortBest);

    };

    // Total number of players for each team
    let numTeamAPlayers = Math.floor(players.length / 2);
    let numTeamBPlayers = players.length - numTeamAPlayers

    const formationA = getIdealDistribution(numTeamAPlayers);
    const formationB = getIdealDistribution(numTeamBPlayers);

    if (addPlayerAtPos(formationA, 0, 0, true, sortWorst)) --numTeamAPlayers;
    if (addPlayerAtPos(formationB, 0, 0, false, sortWorst)) --numTeamBPlayers;

    teamATotalScore = 0;
    teamBTotalScore = 0;

    let foundAZones = [isEmptyFormation(formationA, 0), isEmptyFormation(formationA, 1), isEmptyFormation(formationA, 2), isEmptyFormation(formationA, 3)];
    let foundBZones = [isEmptyFormation(formationB, 0), isEmptyFormation(formationB, 1), isEmptyFormation(formationB, 2), isEmptyFormation(formationB, 3)];

    while (numTeamAPlayers || numTeamBPlayers) {
        if (foundAZones.every(val => val === true) && foundBZones.every(val => val === true)) {
            throw new Error("WTF???");
        }

        const currZone = Math.round(Math.random() * 3);

        if (((numTeamAPlayers && teamATotalScore <= teamBTotalScore) || !numTeamBPlayers) && !foundAZones[currZone]) {
            if (addPlayer(formationA, currZone, true)) --numTeamAPlayers;
        } else if (numTeamBPlayers && !foundBZones[currZone]) {
            if (addPlayer(formationB, currZone, false)) --numTeamBPlayers;
        }

        foundAZones[currZone] = foundAZones[currZone] || isEmptyFormation(formationA, currZone);
        foundBZones[currZone] = foundBZones[currZone] || isEmptyFormation(formationB, currZone);
    }

    return {
        a: { team: teamA, score: teamATotalScore, totals: teamAZoneScores },
        b: { team: teamB, score: teamBTotalScore, totals: teamBZoneScores }
    } as TeamResults;

};

const getZones = (players: ScoredPlayer[], recursive: boolean, numSimulations: number) => {
    let bestAssignment: TeamResults = {
        a: { team: structuredClone(emptyTeamZones), score: 0, totals: [0, 0, 0] },
        b: { team: structuredClone(emptyTeamZones), score: 0, totals: [0, 0, 0] }
    };

    // Tracking best values for output clarity
    let bestWeightedScore = -Infinity;
    let bestBalanceDiff = Infinity;
    let bestZoneScore = 0;

    // Adjustable weights (total sums to 1)
    const W_quality = 50; // Normalize overall player quality
    const W_balance = 50; // Normalize team balance
    const W_local_zonal = 0.0;   // Normalize zonal variance
    const W_zonal = 100;   // Normalize zonal variance

    for (let i = 0; i < numSimulations; i++) {
        let results: TeamResults;

        try {
            results = recursive ? getZones(players, false, numSimulations) : assignPlayersToTeams(structuredClone(players));
        } catch (error) {
            console.warn(error);
            continue;
        }

        // Count players per team overall
        let teamAPlayers = results.a.team.flat().length;
        let teamBPlayers = results.a.team.flat().length;
        // let totalPlayers = teamAPlayers + teamBPlayers;

        // Maximum possible scores (each player can score 100)
        let maxTeamAScore = (teamAPlayers - 1) * 100;
        let maxTeamBScore = (teamBPlayers - 1) * 100;
        let maxTotalScore = maxTeamAScore + maxTeamBScore;

        // Overall team total scores
        let totalScore = results.a.score + results.a.score;

        // 1. Normalize overall quality (average player quality)
        let normalizedQuality = totalScore / maxTotalScore; // 1 means every player scored 100

        // 2. Normalize team balance
        let diff = Math.abs(results.a.score - results.b.score);
        // Maximum possible difference is if the larger team scores max and the smaller scores 0.
        let maxPossibleDiff = Math.max(teamAPlayers, teamBPlayers) * 100;
        let normalizedBalance = 1 - (diff / maxPossibleDiff); // 1 is perfect balance

        // 3. Normalize zonal variance
        let totalZoneDiff = 0;
        let localZoneSum = 0;
        let zoneDev = 0;

        localZoneSum += results.a.totals.reduce((acc, w) => acc + w, 0);
        localZoneSum += results.b.totals.reduce((acc, w) => acc + w, 0);
        localZoneSum /= 6;

        for (let zone = 1; zone < 4; zone++) {
            let zonePlayers = teamAPlayers + teamBPlayers;
            zoneDev = Math.pow(((results.a.totals[zone] + results.b.totals[zone]) / 2) - localZoneSum, 2);

            let zoneDiff = Math.abs(results.a.totals[zone] - results.b.totals[zone]);
            let worstAcceptable = zonePlayers * 50;
            let normZone = 1 - (zoneDiff / worstAcceptable);
            // Clamp the value between 0 and 1
            normZone = Math.max(0, Math.min(1, normZone));
            totalZoneDiff += zoneDiff;
        }

        // Overall zonal score is the average of the three zones
        let normalizedZonal = (1 - ((totalZoneDiff / 3) / maxPossibleDiff));// zoneScoresNormalized.reduce((a, b) => a + b, 0) / 3;
        let normalizedLocalZonal = (1 - ((zoneDev) / maxPossibleDiff));// zoneScoresNormalized.reduce((a, b) => a + b, 0) / 3;

        // Compute weighted overall score
        let weightedScore =

            W_quality * normalizedQuality +
            W_balance * normalizedBalance +
            W_zonal * normalizedZonal +
            W_local_zonal * normalizedLocalZonal;

        // Choose best assignment based on weighted score
        if (weightedScore > bestWeightedScore) {
            bestWeightedScore = weightedScore;
            bestAssignment = results
            bestBalanceDiff = diff;
            bestZoneScore = normalizedZonal;
        }
    }

    if (!recursive) {
        // console.log("Internal Run Team Totals: A:", bestAssignment.a.score, "B:", bestAssignment.b.score);
        return bestAssignment;
    }

    console.log("===== Final Optimized Team Zone Scores =====");
    console.log("Team A Zones (GK, Defense, Midfield, Attack):", bestAssignment.a.totals);
    console.log("Team B Zones (GK, Defense, Midfield, Attack):", bestAssignment.b.totals);
    console.log("==================================");
    console.log("Total Scores → Team A:", bestAssignment.a.score, "Team B:", bestAssignment.b.score);
    console.log("Team Balance Difference (Lower is better):", bestBalanceDiff);
    console.log("Overall Zonal Score (0 to 1, 1 is best balance):", bestZoneScore);
    console.log("Weighted Score (0 to 1):", bestWeightedScore / (W_quality + W_balance + W_local_zonal + W_zonal));
    console.log("==================================");

    return bestAssignment;
};

const normalizeWeights = (zoneWeights: Weighting): Weighting => {
    return zoneWeights.map(zoneArray =>
        zoneArray.map(positionObject => {
            const sum = positionObject.weighting.reduce((acc, w) => acc + w, 0);
            const normalizedWeights = positionObject.weighting.map(w => w / sum);
            return { ...positionObject, weighting: normalizedWeights }; // Return new object
        })
    ) as Weighting;
};

const logPlayerStats = (players: ScoredPlayer[]) => {
    // this is just for logging purposes
    // kinda interesting to see the full sorted list
    // remove when this gets optimized
    players.sort((a, b) => {
        // Flatten zoneFit values into a single sorted array (highest to lowest)
        // Exclude goalkeeper (first value)
        const aScores = Object.values(a.zoneFit).flat().slice(1).sort((x, y) => y - x);
        const bScores = Object.values(b.zoneFit).flat().slice(1).sort((x, y) => y - x);

        // Compare element by element
        for (let i = 0; i < Math.min(aScores.length, bScores.length); i++) {
            if (aScores[i] !== bScores[i]) {
                return bScores[i] - aScores[i]; // Descending order
            }
        }

        return 0; // Players are equal in ranking
    });

    //Function to get the best position (zone + position) for each player
    const getBestPosition = (zoneFit: ZoneScores) => {
        let bestZone = 0;
        let bestPosition = 0;
        let bestScore = -Infinity;

        let secondBestZone = 0;
        let secondBestPosition = 0;
        let secondBestScore = -Infinity;

        Object.entries(zoneFit).forEach(([zone, positions], zoneIdx) => {
            Object.entries(positions).forEach(([position, score], positionIdx) => {
                if (zoneIdx === 0 && positionIdx === 0) return; // Skip the first position (0 index) within the first zone

                if (score > bestScore) {
                    secondBestZone = bestZone;
                    secondBestPosition = bestPosition;
                    secondBestScore = bestScore;

                    bestZone = parseInt(zone);
                    bestPosition = parseInt(position);
                    bestScore = score;
                } else if (score > secondBestScore) {
                    secondBestZone = parseInt(zone);
                    secondBestPosition = parseInt(position);
                    secondBestScore = score;
                }
            });
        });

        return {
            best: {
                pos: weightingShortLabels[bestZone].positions[bestPosition],
                score: bestScore,
            },
            secondBest: {
                pos: weightingShortLabels[secondBestZone].positions[secondBestPosition],
                score: secondBestScore,
            },
        };
    };

    console.log("===== Ranked Players With Zone Ratings (Best to Worst) =====", players);

    players.forEach(player => {
        const scores = getBestPosition(player.zoneFit);
        console.log(`${player.name} Best Scores: `);
        console.log(scores.best, scores.secondBest);
    });
};

const getXForPlayerPosition = (position: PositionWeighting, positionIndex: number, numPositionentries: number) => {
    if (!position.isCentral) {
        if (positionIndex >= 2) throw new Error(`More than 2 players in ${position.positionName} position?`);
        return positionIndex;
    }

    let startShift = 0.0;
    let spacing = 0.4 / (numPositionentries); // Max width for players

    if (numPositionentries % 2) {
        if (positionIndex === 0) return 0.5;
        startShift = spacing;
        positionIndex--;
    } else {
        startShift = -spacing / 2;
    }

    if (positionIndex % 2 === 0) {
        return 0.5 - startShift - (spacing * (1 + Math.floor(positionIndex / 2)));
    } else {
        return 0.5 + startShift + (spacing * (1 + Math.floor(positionIndex / 2)));
    }
};

const assignPositions = (zones: TeamZones, team: string) => {
    let finalPlayers: Player[] = [];

    const numZones = zones.length;
    const zoneYShift = 0.1;
    const zoneYScaling = 0.8;

    zones.forEach((zone, index) => {
        const yEnd = index ? (1.0 - zoneYShift - index * zoneYScaling / numZones) : 1.0;
        const yStart = index ? (1.0 - zoneYShift - (index + 1) * zoneYScaling / numZones) : 1.0;

        zone.forEach((players) => {
            const numPositionPlayers = players.length;
            players.forEach((player, pidx) => {
                const x = getXForPlayerPosition(player.generatedPositionInfo, pidx, numPositionPlayers);
                const y = player.generatedPositionInfo.relativeYPosition * (yEnd - yStart) + yStart;
                finalPlayers.push({ ...player, team, position: { x, y } } as Player);
            });
        });

    });

    return finalPlayers;
}

const generateBalancedTeams = (players: Player[], attributeWeights: Weighting) => {
    if (players.length < 2) return { a: [], b: [] };

    let scoredPlayers = calculateScores(players, normalizeWeights(attributeWeights));

    logPlayerStats(scoredPlayers);

    const teams = getZones(scoredPlayers, true, 30);

    // Assign positions for both teams
    const positionsA = assignPositions(teams.a.team, "a");
    const positionsB = assignPositions(teams.b.team, "b");

    return { a: positionsA, b: positionsB };
};

export const autoCreateTeams = (players: Player[], attributeWeights: Weighting) => {
    if (players.length < 10) throw new Error("Not enough players to form teams");
    if (players.length > 24) throw new Error("Too many players to form teams");
    return generateBalancedTeams(players, attributeWeights);
};
