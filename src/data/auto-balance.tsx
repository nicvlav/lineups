
import {
    defaultZoneWeights,
    ZoneKeys,
    ZonePositions,
    getThreatScore,
    formationTemplates,
} from "@/data/position-types";

import {
    ScoredGamePlayer,
} from "@/data/player-types";

import {
    ArrayScoredGamePlayer,
    toArrayScoredGamePlayers,
    ZoneScoresArray,
    zoneScoresToArray,
    ZonePlayers,
    emptyZonePlayers,
    TeamResults,
    assignPositions,
} from "@/data/auto-balance-types";

const getIdealDistribution = (numPlayers: number) => {
    const formations = formationTemplates[numPlayers];

    if (!formations || formations.length === 0) throw new Error("Not enough players to form teams");

    const numTemplates = formations.length;
    const index = Math.round(Math.random() * (numTemplates - 1));

    return zoneScoresToArray(structuredClone(formations[index].positions));
}

const isEmptyFormation = (formation: ZoneScoresArray, zone: number) =>
    formation[zone].every(position => position <= 0);


const getBestAndSecondBestStats = (zoneFitArr: ZoneScoresArray) => {
    const sortedStats = zoneFitArr.flat().sort((x, y) => y - x); // Sort descending
    const best = sortedStats[0];
    const secondBest = sortedStats[1] || 0;
    return { best, secondBest };
};

type SpecialistInfo = {
    score: number,
    zoneIndex: number,
    positionIndex: number,
};


function getZoneSpecialistZoneAndPosition(player: ArrayScoredGamePlayer, dist: ZoneScoresArray, dominanceRatio = 1.05): SpecialistInfo | undefined {
    const infos: SpecialistInfo[] = [];

    player.zoneFitArr.forEach((zoneArr, zoneIndex) => {
        zoneArr.forEach((score, positionIndex) => {
            if (!dist[zoneIndex][positionIndex]) return;
            infos.push({ score, zoneIndex, positionIndex });
        });
    });

    const sorted = infos.sort((a, b) => b.score - a.score);

    if (sorted.length === 0) return undefined;
    if (sorted.length === 1) return sorted[0];

    const best = sorted[0];
    const second = sorted[1];

    return best.score >= second.score * dominanceRatio ? best : undefined;
}

// special sorting with randomization
const sortBest = (players: ArrayScoredGamePlayer[], zone: number, position: number, randomSeed: number, dist: ZoneScoresArray) => {
    // const specializationRatios = [randomSeed * 0.8 + 0.1, randomSeed * 0.5 + 0.1, randomSeed * 0.2 + 0.0];

    // Pick the best available player from this zone
    const aSeed = randomSeed > 0.5 ? 1 + randomSeed : 1 - randomSeed;//specializationRatios[zone];
    const bSeed = 1 / aSeed;//specializationRatios[zone];

    // Sort player pool by specialization in the zone
    players.sort((a, b) => {
        const aStats = getBestAndSecondBestStats(a.zoneFitArr);
        const bStats = getBestAndSecondBestStats(b.zoneFitArr);

        const aSpecialZone = getZoneSpecialistZoneAndPosition(a, dist);
        const bSpecialZone = getZoneSpecialistZoneAndPosition(b, dist);

        const aFit = a.zoneFitArr[zone][position];
        const bFit = b.zoneFitArr[zone][position];

        // === STEP 1: One is a zone specialist for this zone, the other isn't
        if (aSpecialZone !== bSpecialZone) {
            if (aSpecialZone && aSpecialZone.zoneIndex === zone && aSpecialZone.positionIndex === position) return -1;
            if (bSpecialZone && bSpecialZone.zoneIndex === zone && bSpecialZone.positionIndex === position) return 1;
            return aSpecialZone ? 1 : -1;  // Prefer non-specialist for off-zone cases
        }

        // === STEP 2: Both are specialists
        if (aSpecialZone && bSpecialZone) {
            const aMatchesZone = aSpecialZone.zoneIndex === zone
            const bMatchesZone = bSpecialZone.zoneIndex === zone

            const aMatchesPos = aMatchesZone && aSpecialZone.positionIndex === position;
            const bMatchesPos = bMatchesZone && bSpecialZone.positionIndex === position;

            // One matches pos, one doesn't
            if (aMatchesPos !== bMatchesPos) return aMatchesPos ? -1 : 1;

            if (aMatchesZone !== bMatchesZone) return aMatchesPos ? -1 : 1;

            const aRatio = aStats.best / (aStats.secondBest || 1);
            const bRatio = bStats.best / (bStats.secondBest || 1);

            if (aMatchesPos && bMatchesPos) {
                // Both match the pos — prefer sharper specialization, slightly softened by randomness
                return (bRatio * bSeed) - (aRatio * aSeed);
            } else {
                // Both are specialists for another pos — prefer the more adaptable one
                return (aRatio * aSeed) - (bRatio * bSeed);
            }
        }

        // === STEP 3: Standard fallback with random-weighted specialization scoring
        const specializationScoreA = aFit / (aStats.secondBest || 1);
        const specializationScoreB = bFit / (bStats.secondBest || 1);

        const weightedA = specializationScoreA * aSeed * aFit;
        const weightedB = specializationScoreB * bSeed * bFit;

        return weightedB - weightedA;
    });

};

const sortWorst = (players: ArrayScoredGamePlayer[], _: number, __: number, ___: number) => {
    // Sort player pool by specialization in the zone
    players.sort((a, b) => {
        const aStats = getBestAndSecondBestStats(a.zoneFitArr);
        const bStats = getBestAndSecondBestStats(b.zoneFitArr);

        return (aStats.best - bStats.best);
    });
};

const assignPlayersToTeams = (players: ArrayScoredGamePlayer[]) => {
    let teamA: ZonePlayers = structuredClone(emptyZonePlayers);
    let teamB: ZonePlayers = structuredClone(emptyZonePlayers);

    let teamATotalScore = 0;
    let teamBTotalScore = 0;

    let teamAZoneScores = [0, 0, 0, 0];
    let teamBZoneScores = [0, 0, 0, 0];

    // Dynamic weighting ratio - multiplier indicates random limit
    // eg - 0.1 means at most we can randomize players by 10%
    const rand = Math.random() * 0.1;

    const addPlayerAtPos = (dist: ZoneScoresArray, zone: number, position: number, isTeamA: boolean, sortType: (players: ArrayScoredGamePlayer[], zone: number, position: number, rand: number, dist: ZoneScoresArray) => void) => {
        if (dist[zone][position] <= 0) return false;

        if (teamA[zone] === undefined || teamA[zone][position] === undefined) {
            // console.log("HUH");
            return false
        }

        sortType(players, zone, position, rand, dist);

        let player = players.shift();

        if (!player) return false;

        const weight = defaultZoneWeights[ZonePositions[ZoneKeys[zone]][position]];

        dist[zone][position] -= 1;

        if (isTeamA) {
            teamAZoneScores[zone] += player.zoneFitArr[zone][position];
            teamATotalScore += player.zoneFitArr[zone][position];
            teamA[zone][position].push({ ...player, generatedPositionInfo: weight });
        } else {
            teamBZoneScores[zone] += player.zoneFitArr[zone][position];
            teamBTotalScore += player.zoneFitArr[zone][position];
            teamB[zone][position].push({ ...player, generatedPositionInfo: weight });
        }

        return true;

    };

    const addPlayer = (dist: ZoneScoresArray, zone: number, isTeamA: boolean) => {
        const formationZone = dist[zone];

        if (formationZone.length <= 0) return false;

        // Sort positions by priorityStat (lower is better), breaking ties with count and index
        const sortedPositions = formationZone
            .map((count, positionIndex) => ({
                count,
                positionIndex,
                priority: defaultZoneWeights[ZonePositions[ZoneKeys[zone]][positionIndex]].priorityStat
            }))
            .filter(pos => pos.count > 0) // Ignore empty positions
            .sort((a, b) =>
                a.priority - b.priority || // Lower priority first
                b.count - a.count || // More players in that position
                a.positionIndex - b.positionIndex // Lower index if still tied
            );

        if (sortedPositions.length <= 0 || !sortedPositions[0]) return false;

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

    if (teamA[0][0].length && teamB[0][0].length) {
        teamATotalScore += Math.max(...teamA[0][0][0].zoneFitArr.flat());
        teamBTotalScore += Math.max(...teamB[0][0][0].zoneFitArr.flat());
    }

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

const getZones = (players: ArrayScoredGamePlayer[], recursive: boolean, numSimulations: number) => {
    let bestAssignment: TeamResults = {
        a: { team: structuredClone(emptyZonePlayers), score: 0, totals: [0, 0, 0, 0] },
        b: { team: structuredClone(emptyZonePlayers), score: 0, totals: [0, 0, 0, 0] }
    };

    // Tracking best values for output clarity
    let bestWeightedScore = -Infinity;

    // Adjustable weights (total sums to 1)
    const W_quality = recursive ? 0.0 : 0.2; // Normalize overall player quality
    const W_efficiency = recursive ? 0.2 : 0.5; // Normalize overall player quality
    const W_balance = recursive ? 0.6 : 0.0; // Normalize team balance
    const W_pos_balance = recursive ? 0.2 : 0.0; // Normalize team balance
    const W_zonal = recursive ? 0.0 : 0.3;   // Normalize zonal variance

    for (let i = 0; i < numSimulations; i++) {
        let results: TeamResults;

        try {
            results = recursive ? getZones(players, false, numSimulations / 20) : assignPlayersToTeams(structuredClone(players));
            // results = assignPlayersToTeams(structuredClone(players));
        } catch (error) {
            console.warn(error);
            continue;
        }

        let normalizedZonal = 1;
        let efficiencyDiff = 0;
        let normalizedEfficiency = 0;

        let teamAPlayers = 0;
        let teamBPlayers = 0;

        let aPositionalTotal = 0;
        let bPositionalTotal = 0;

        let aPeakTotal = 0;
        let bPeakTotal = 0;

        for (let zone = 0; zone <= 3; zone++) {
            const a = results.a.team[zone].flat();
            const b = results.b.team[zone].flat();

            // realtive sum is the scores based on players at assigned positions
            const aZoneRelativeSum = results.a.totals[zone] / 100;
            const bZoneRelativeSum = results.b.totals[zone] / 100;

            // peak sum is the sum of all players' abolsute best position scores - max potential
            let aZonePeakSum = 0;
            let bZonePeakSum = 0;

            a.forEach((player) => {
                const x = player.generatedPositionInfo.isCentral ? 0.5 : 0.0;
                const y = player.generatedPositionInfo.absoluteYPosition;
                const threat = getThreatScore({ x, y }, player.zoneFit);
                const maxScore = Math.max(...player.zoneFitArr.flat()) / 100;
                const ratio = ((maxScore - threat) / maxScore);

                efficiencyDiff += Math.pow(ratio, 0.1);
                aZonePeakSum += maxScore;
                teamAPlayers++;
            });

            b.forEach((player) => {
                const x = player.generatedPositionInfo.isCentral ? 0.5 : 0.0;
                const y = player.generatedPositionInfo.absoluteYPosition;
                const threat = getThreatScore({ x, y }, player.zoneFit);
                const maxScore = Math.max(...player.zoneFitArr.flat()) / 100;
                const ratio = Math.pow(((maxScore - threat) / maxScore), 0.5)

                efficiencyDiff += Math.pow(ratio, 0.1);
                bZonePeakSum += maxScore;
                teamBPlayers++;
            });

            aPeakTotal += aZonePeakSum;
            bPeakTotal += bZonePeakSum;

            // goalkeeper zone - take their peak score for both totals
            // dont include this zone in zonal calculations
            if (!zone) {
                aPositionalTotal += aZonePeakSum;
                bPositionalTotal += bZonePeakSum;
                continue;
            }

            aPositionalTotal += aZoneRelativeSum;
            bPositionalTotal += bZoneRelativeSum;

            const aZoneNum = a.length;
            const bZoneNum = b.length;

            // zone score is based on player assignments rather than absolute peak score
            const aZoneAvg = aZoneRelativeSum / aZoneNum;
            const bZoneAvg = bZoneRelativeSum / bZoneNum;

            const maxAvg = Math.min(aZoneAvg, bZoneAvg);
            const diff = Math.abs(aZoneAvg - bZoneAvg) / maxAvg;

            // If both averages are 0, assume perfect balance (avoid 0/0)
            // zone score is the average zone score for team a vs average team score for team b
            // high score means both seems have similar average zone scores, low means there is a quality gap
            let zoneScore = maxAvg === 0 ? 1 : (1 - diff / maxAvg);

            normalizedZonal *= Math.pow(zoneScore, 0.5);
        }

        // Maximum possible scores (each player can score 100)
        let maxTeamAScore = teamAPlayers;
        let maxTeamBScore = teamBPlayers;
        let maxTotalScore = maxTeamAScore + maxTeamBScore;

        // Normalize overall quality (average player quality)
        let normalizedQuality = Math.pow((aPositionalTotal + bPositionalTotal) / maxTotalScore, 0.33); // 1 means every player scored 100

        // Normalize team balance
        let diff = Math.abs(aPeakTotal - bPeakTotal);
        // Maximum possible difference is if the larger team scores max and the smaller scores 0.
        let maxPossibleDiff = Math.max(teamAPlayers, teamBPlayers);
        let normalizedBalance = 1 - Math.pow(diff / maxPossibleDiff, 0.25); // 1 is perfect balance

        let diffPos = Math.abs(aPositionalTotal - bPositionalTotal);
        let normalizedPosBalance = 1 - Math.pow(diffPos / maxPossibleDiff, 0.25); // 1 is perfect balanc

        // exclude goalkeepers
        normalizedEfficiency = 1 - (efficiencyDiff / (teamAPlayers + teamBPlayers));


        // Compute weighted overall score
        let weightedScore =
            W_quality * normalizedQuality +
            W_efficiency * normalizedEfficiency +
            W_balance * normalizedBalance +
            W_pos_balance * normalizedPosBalance +
            W_zonal * normalizedZonal;

        // console.log("(teamAPlayers + teamBPlayers)", teamAPlayers + teamBPlayers);
        // console.log("aPeakTotal, bPeakTotal", aPeakTotal, bPeakTotal);
        // console.log("totalPositionalScore", aPositionalTotal + bPositionalTotal);
        // console.log("normalizedEfficiency", W_efficiency, normalizedEfficiency);
        // console.log("normalizedQuality", W_quality, normalizedQuality);
        // console.log("normalizedBalance", W_balance, normalizedBalance, aPeakTotal, bPeakTotal);
        // console.log("normalizedZonal", W_zonal, normalizedZonal);
        // console.log("weightedScore", weightedScore);

        // Choose best assignment based on weighted score
        if (weightedScore > bestWeightedScore) {
            bestWeightedScore = weightedScore;
            bestAssignment = results
        }

    }

    if (!recursive) {
        // console.log("Internal Run Team Totals: A:", bestAssignment.a.score, "B:", bestAssignment.b.score);
        return bestAssignment;
    }

    let peakScoreA = 0;
    let peakScoreB = 0;

    const a = bestAssignment.a.team.flat().flat();
    const b = bestAssignment.b.team.flat().flat();

    [...a].forEach((player) => {
        peakScoreA += Math.max(...player.zoneFitArr.flat());
    });

    [...b].forEach((player) => {
        peakScoreB += Math.max(...player.zoneFitArr.flat());
    });


    console.log("===== Final Optimized Team Zone Scores =====");
    console.log("Team A Zones (GK, Defense, Midfield, Attack):", bestAssignment.a.totals);
    console.log("Team B Zones (GK, Defense, Midfield, Attack):", bestAssignment.b.totals);
    console.log("==================================");
    console.log("Total Positional Scores → Team A:", bestAssignment.a.score, "Team B:", bestAssignment.b.score);
    console.log("Team Positional Balance Difference (Lower is better):", Math.abs(bestAssignment.a.score - bestAssignment.b.score));

    console.log("Total Peak Scores → Team A:", peakScoreA, "Team B:", peakScoreB);
    console.log("Team Peak Balance Difference (Lower is better):", Math.abs(peakScoreA - peakScoreB));
    console.log("==================================");

    return bestAssignment;
};


const generateBalancedTeams = (scoredPlayers: ScoredGamePlayer[]) => {
    if (scoredPlayers.length < 2) return { a: [], b: [] };

    const teams = getZones(toArrayScoredGamePlayers(scoredPlayers), true, 200);

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

// export const autoCreateTeamsFilled = (players: FilledGamePlayer[], attributeWeights: Weighting) => {
//     return autoCreateTeamsScored(calculateScores(players, normalizedDefaultWeights));
// };
