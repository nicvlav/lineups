import { attributeScores, ZoneScores, Weighting, emptyZoneScores, PositionWeighting, PositionWeightingAndIndex, weightingShortLabels, Point, defaultZoneWeights } from "@/data/attribute-types"; // Importing from shared file

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

export interface ScoredGamePlayerWithThreat extends ScoredGamePlayer {
    threatScore: number;
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


const getProximityScore = (absolutePosition: Point, position: PositionWeighting) => {
    const centerThreshold = 0.3;
    const y = 1 - Math.abs(position.absoluteYPosition - absolutePosition.y);
    let score = y;

    if (absolutePosition.x <= (1 - centerThreshold) && absolutePosition.x >= centerThreshold) {
        score = position.isCentral ? y : 0;
    } else {
        const x = (absolutePosition.x < centerThreshold ? absolutePosition.x : (1 - absolutePosition.x)) / centerThreshold;
        score = position.isCentral ? Math.max(0, x) * y : Math.max(0, 1 - x) * y;
    }

    return Math.pow(score, 10);


};

const filterByVerticalProximity = (positions: PositionWeightingAndIndex[], y: number) => {
    positions.sort((a, b) => Math.abs(a.position.absoluteYPosition - y) - Math.abs(b.position.absoluteYPosition - y));

    const filteredPositions: PositionWeightingAndIndex[] = [];

    let foundAboveOrEqual = false;
    let foundBelow = false;

    for (const pos of positions) {
        if (pos.position.absoluteYPosition < y) {
            if (foundBelow) continue;

            filteredPositions.push(pos);
            foundBelow = true;

            if (foundAboveOrEqual) break;

        } else {
            if (foundAboveOrEqual) continue;

            filteredPositions.push(pos);
            foundAboveOrEqual = true;

            if (foundBelow) break;
        }
    }

    return filteredPositions;
};

export const getPointForPosition = (position: PositionWeighting, positionIndex: number, numPositionentries: number) => {
    return {
        x: getXForPlayerPosition(position, positionIndex, numPositionentries),
        y: position.absoluteYPosition
    } as Point;
};

const getProximityPositions = (point: Point) => {
    const zonePositions = defaultZoneWeights.flat().map((position, index) => {
        return { position, originalFlatZoneIndex: index } as PositionWeightingAndIndex;
    }).slice(1);

    let centrals = filterByVerticalProximity(zonePositions.filter((zone) => zone.position.isCentral), point.y);
    let wides = filterByVerticalProximity(zonePositions.filter((zone) => !zone.position.isCentral), point.y);

    const weights = [...centrals, ...wides].map(position => {
        return { ...position, weight: getProximityScore(point, position.position) };
    });

    weights.filter((position) => position.weight > 0).sort((a, b) => b.weight - a.weight);

    if (weights.length > 0 && weights[0].weight == 1) {
        return weights.slice(0, 1);
    }

    return weights;
};

export const normalizeWeights = (zoneWeights: Weighting): Weighting => {
    return zoneWeights.map(zoneArray =>
        zoneArray.map(positionObject => {
            const sum = positionObject.weighting.reduce((acc, w) => acc + w, 0);
            const normalizedWeights = positionObject.weighting.map(w => w / sum);
            return { ...positionObject, weighting: normalizedWeights }; // Return new object
        })
    ) as Weighting;
};

export const getThreatScore = (point: Point, playerScores: ZoneScores) => {
    const proximityPositions = getProximityPositions(point);

    const sum = proximityPositions.reduce((acc, w) => acc + w.weight, 0);

    proximityPositions.forEach((position) => {
        position.weight = position.weight / sum;
    });

    const flatScores = playerScores.flat();

    const threat = proximityPositions.reduce((acc, w) => {
        const c = (w.originalFlatZoneIndex > 0 && w.originalFlatZoneIndex < flatScores.length) ? flatScores[w.originalFlatZoneIndex] : 0;
        return acc + (c * w.weight / 100);
    }, 0);

    return threat;

};

export const interpolateColor = (c1: string, c2: string, t: number) => {
    const hex = (str: string) => parseInt(str, 16);
    const r1 = hex(c1.slice(1, 3)), g1 = hex(c1.slice(3, 5)), b1 = hex(c1.slice(5, 7));
    const r2 = hex(c2.slice(1, 3)), g2 = hex(c2.slice(3, 5)), b2 = hex(c2.slice(5, 7));
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r}, ${g}, ${b})`;
};

export const getThreatColor = (score: number): string => {
    // Magma-inspired color palette
    const colors = [
        { stop: 0, color: '#000003' },     // near black, low threat
        { stop: 0.15, color: '#1d0c3e' },  // dark purple
        { stop: 0.30, color: '#3f0c58' },  // dark magenta
        { stop: 0.50, color: '#662d91' },  // purple
        { stop: 0.60, color: '#9e3a8b' },  // pinkish purple
        { stop: 0.70, color: '#d54f6e' },  // soft magenta
        { stop: 0.75, color: '#f06359' },  // soft red-pink
        { stop: 0.80, color: '#ff8153' },  // orange-red
        { stop: 0.85, color: '#ff9d3f' },  // light orange
        { stop: 0.90, color: '#ffcc2d' },  // yellow
        { stop: 1.00, color: '#f7f7f7' },  // light yellow (max threat)
    ];

    for (let i = 1; i < colors.length; i++) {
        const prev = colors[i - 1];
        const current = colors[i];
        if (score <= current.stop) {
            const ratio = (score - prev.stop) / (current.stop - prev.stop);
            return interpolateColor(prev.color, current.color, ratio);
        }
    }
    return colors[colors.length - 1].color;
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

    zones.forEach((zone) => {
        zone.forEach((players) => {
            players.forEach((player, pidx) => {
                finalPlayers.push({
                    ...player,
                    team,
                    position: getPointForPosition(player.generatedPositionInfo,
                        pidx,
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
