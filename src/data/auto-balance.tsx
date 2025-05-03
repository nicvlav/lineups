
import {
    defaultZoneWeights,
    formationTemplates,
    Weighting,
    ZoneScores,
    normalizeWeights
} from "@/data/attribute-types";

import {
    FilledGamePlayer,
    ScoredGamePlayer,
    TeamZones,
    emptyTeamZones,
    TeamResults,
    calculateScores,
    assignPositions
} from "@/data/player-types";

const getIdealDistribution = (numPlayers: number) => {
    const formations = formationTemplates[numPlayers];

    if (!formations || formations.length === 0) throw new Error("Not enough players to form teams");

    const numTemplates = formations.length;
    const index = Math.round(Math.random() * (numTemplates - 1));

    return structuredClone(formations[index].positions);
}

const isEmptyFormation = (formation: ZoneScores, zone: number) =>
    formation[zone].every(position => position <= 0);


const getBestAndSecondBestStats = (zoneFit: ZoneScores) => {
    const sortedStats = zoneFit.flat().sort((x, y) => y - x); // Sort descending
    const best = sortedStats[0];
    const secondBest = sortedStats[1] || 0;
    return { best, secondBest };
};

const sortBest = (players: ScoredGamePlayer[], zone: number, position: number, randomSeed: number) => {
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

const sortWorst = (players: ScoredGamePlayer[], _: number, __: number, ___: number) => {
    // Sort player pool by specialization in the zone
    players.sort((a, b) => {
        const aStats = getBestAndSecondBestStats(a.zoneFit);
        const bStats = getBestAndSecondBestStats(b.zoneFit);

        return (aStats.best - bStats.best);
    });
};

const assignPlayersToTeams = (players: ScoredGamePlayer[]) => {
    let teamA: TeamZones = structuredClone(emptyTeamZones);
    let teamB: TeamZones = structuredClone(emptyTeamZones);

    let teamATotalScore = 0;
    let teamBTotalScore = 0;

    let teamAZoneScores = [0, 0, 0, 0];
    let teamBZoneScores = [0, 0, 0, 0];

    // // Dynamic weighting ratio
    const rand = Math.random();

    const addPlayerAtPos = (dist: ZoneScores, zone: number, position: number, isTeamA: boolean, sortType: (players: ScoredGamePlayer[], zone: number, position: number, rand: number) => void) => {
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
    const formationB = numTeamAPlayers == numTeamBPlayers ? structuredClone(formationA) : getIdealDistribution(numTeamBPlayers);

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

const getZones = (players: ScoredGamePlayer[], recursive: boolean, numSimulations: number) => {
    let bestAssignment: TeamResults = {
        a: { team: structuredClone(emptyTeamZones), score: 0, totals: [0, 0, 0] },
        b: { team: structuredClone(emptyTeamZones), score: 0, totals: [0, 0, 0] }
    };

    // Tracking best values for output clarity
    let bestWeightedScore = -Infinity;
    let bestBalanceDiff = Infinity;
    let bestZoneScore = 0;

    // Adjustable weights (total sums to 1)
    const W_quality = recursive ? 0.5 : 0.4; // Normalize overall player quality
    const W_balance = recursive ? 0.2 : 0.0; // Normalize team balance
    const W_bzonal = recursive ? 0.3 : 0.0; // Normalize team balance
    const W_zonal = recursive ? 0.0 : 0.6;   // Normalize zonal variance

    for (let i = 0; i < numSimulations; i++) {
        let results: TeamResults;

        try {
            results = recursive ? getZones(players, false, numSimulations / 10) : assignPlayersToTeams(structuredClone(players));
            // results = assignPlayersToTeams(structuredClone(players));
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
        // 3. Normalize zonal balance using inverted difference ratio
        let normalizedZonal = 1;
        let normalizedBZonal = 1;

        for (let zone = 1; zone <= 3; zone++) {
            const aZoneSum = results.a.totals[zone];
            const bZoneSum = results.b.totals[zone];

            const aZoneNum = results.a.team[zone].flat().length;
            const bZoneNum = results.b.team[zone].flat().length;

            // console.log("aZoneNum and bZoneNum", aZoneNum, bZoneNum);

            const aZoneAvg = aZoneSum / aZoneNum;
            const bZoneAvg = bZoneSum / bZoneNum;

            // console.log("aZoneAvg and bZoneAvg", aZoneAvg, bZoneAvg);
            const maxAvg = Math.min(aZoneAvg, bZoneAvg);
            const diff = Math.sqrt(Math.abs(aZoneAvg - bZoneAvg) / maxAvg);

            const maxBAvg = Math.min(aZoneSum, bZoneSum);
            const bdiff = Math.abs(aZoneSum - bZoneSum) / maxBAvg;

            // If both averages are 0, assume perfect balance (avoid 0/0)
            let zoneScore = maxAvg === 0 ? 1 : 1 - diff;
            let bZoneScore = maxAvg === 0 ? 1 : 1 - bdiff;

            // console.log("zoneScore", zoneScore);

            normalizedZonal *= zoneScore;
            normalizedBZonal *= bZoneScore;
        }

        // console.log("normalizedQuality", W_quality, normalizedQuality);
        // console.log("normalizedBalance", W_balance, normalizedBalance);
        // console.log("normalizedZonal", W_zonal, normalizedZonal);

        // Compute weighted overall score
        let weightedScore =

            W_quality * normalizedQuality +
            W_balance * normalizedBalance +
            W_bzonal * normalizedBZonal +
            W_zonal * normalizedZonal;

        // console.log("weightedScore", weightedScore);

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
    console.log("Weighted Score (0 to 1):", bestWeightedScore / (W_quality + W_balance + W_zonal));
    console.log("==================================");

    return bestAssignment;
};

const generateBalancedTeams = (scoredPlayers: ScoredGamePlayer[]) => {
    if (scoredPlayers.length < 2) return { a: [], b: [] };

    const teams = getZones(scoredPlayers, true, 150);

    // Assign positions for both teams
    const positionsA = assignPositions(teams.a.team, "A");
    const positionsB = assignPositions(teams.b.team, "B");

    return { a: positionsA, b: positionsB };
};


export const autoCreateTeamsScored = (players: ScoredGamePlayer[]) => {
    if (players.length < 10) throw new Error("Not enough players to form teams");
    if (players.length > 24) throw new Error("Too many players to form teams");
    return generateBalancedTeams(players);
};

export const autoCreateTeamsFilled = (players: FilledGamePlayer[], attributeWeights: Weighting) => {
    return autoCreateTeamsScored(calculateScores(players, normalizeWeights(attributeWeights)));
};
