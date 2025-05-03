import { attributeScores, ZoneScores, Weighting, emptyZoneScores, PositionWeighting, weightingShortLabels, Point } from "@/data/attribute-types"; // Importing from shared file

// Core Player data from Supabase
export interface Player {
    id: string;
    name: string;
    stats: attributeScores; // Stored and synced
}

export type PlayerUpdate = Partial<Player>;

// Local-only game-specific attributes
export interface GamePlayer {
    id: string; // null if a temporary guest player
    guest_name: string | null; // non null if a temporary guest player
    team: string;
    position: Point;
}

export type GamePlayerUpdate = Partial<GamePlayer>;

export interface FilledGamePlayer extends GamePlayer {
    stats: attributeScores,
}
export interface ScoredGamePlayer extends GamePlayer {
    zoneFit: ZoneScores;
}

export interface PositionedGamePlayer extends ScoredGamePlayer {
    generatedPositionInfo: PositionWeighting;
}

export type TeamZones = [
    [PositionedGamePlayer[]], // gk
    [PositionedGamePlayer[], PositionedGamePlayer[]], // defense
    [PositionedGamePlayer[], PositionedGamePlayer[], PositionedGamePlayer[], PositionedGamePlayer[]],// midfield
    [PositionedGamePlayer[], PositionedGamePlayer[]]// attack
];

export const emptyTeamZones: TeamZones = [
    [[]], // defense
    [[], []], // defense
    [[], [], [], []],// midfield
    [[], []]// attack
] as const;

export type TeamAssignments = {
    team: TeamZones, score: number, totals: [number, number, number]
};

export type TeamResults = {
    a: TeamAssignments;
    b: TeamAssignments;
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

export const getYRangeForTeamZone = (zoneIndex: number) => {
    const numZones = emptyTeamZones.length;
    const zoneYShift = 0.1;
    const zoneYScaling = 0.8;

    return {
        yEnd: zoneIndex ? (1.0 - zoneYShift - zoneIndex * zoneYScaling / numZones) : 1.0,
        yStart: zoneIndex ? (1.0 - zoneYShift - (zoneIndex + 1) * zoneYScaling / numZones) : 1.0
    }
};

export const getPointForPosition = (position: PositionWeighting, yEnd: number, yStart: number, positionIndex: number, numPositionentries: number) => {
    return {
        x: getXForPlayerPosition(position, positionIndex, numPositionentries),
        y: position.relativeYPosition * (yEnd - yStart) + yStart
    } as Point;
};

export const calculateScoresForStats = (stats: attributeScores, zoneWeights: Weighting): ZoneScores => {
    const zoneFit: ZoneScores = structuredClone(emptyZoneScores);

    zoneWeights.forEach((zoneArray, zone) => {
        zoneArray.forEach((positionObject, position) => {
            // dot product
            const score = stats.reduce((sum, statValue, index) => {
                return sum + statValue * positionObject.weighting[index];
            }, 0);

            zoneFit[zone][position] = score;
        });
    });

    return zoneFit;

};


export const calculateScores = (players: FilledGamePlayer[], zoneWeights: Weighting): ScoredGamePlayer[] => {
    return players.map(player => {

        const zoneFit: ZoneScores = calculateScoresForStats(player.stats, zoneWeights);

        return { ...player, zoneFit } as ScoredGamePlayer;
    });
};

export const assignPositions = (zones: TeamZones, team: string) => {
    let finalPlayers: ScoredGamePlayer[] = [];

    zones.forEach((zone, index) => {
        const { yEnd, yStart } = getYRangeForTeamZone(index);

        zone.forEach((players) => {
            players.forEach((player, pidx) => {
                finalPlayers.push({
                    ...player,
                    team,
                    position: getPointForPosition(player.generatedPositionInfo,
                        yEnd, yStart, pidx,
                        players.length)
                } as ScoredGamePlayer);
            });
        });
    });

    return finalPlayers;
}

export const logPlayerStats = (gamePlayers: Record<string, ScoredGamePlayer>, actualPlayers: Record<string, Player>) => {
    // this is just for logging purposes
    // kinda interesting to see the full sorted list
    // remove when this gets optimized
    let playersArr: ScoredGamePlayer[] = Object.values(gamePlayers).sort((a, b) => {
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

    console.log("===== Ranked Players With Zone Ratings (Best to Worst) =====", playersArr);



    playersArr.forEach(gamePlayer => {
        const scores = getBestPosition(gamePlayer.zoneFit);
        let playerName = gamePlayer.id in actualPlayers ? actualPlayers[gamePlayer.id].name : "[Player]";
        console.log(`${playerName} Best Scores: `);
        console.log(scores.best, scores.secondBest);
    });
};
