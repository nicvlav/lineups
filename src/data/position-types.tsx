import { statKeys, StatsKey } from "@/data/stat-types"; // Importing from shared file

export type Position =
    | "GK"
    | "CB"
    | "FB"
    | "CM"
    | "DM"
    | "WM"
    | "AM"
    | "ST"
    | "WR";

export const positionKeys: Position[] = [
    "GK",
    "CB",
    "FB",
    "DM",
    "CM",
    "WM",
    "AM",
    "ST",
    "WR",
] as const;

export const PositionLabels: Record<Position, string> = {
    GK: "Goalkeeper",
    CB: "Center Back",
    FB: "Full back",
    DM: "Defensive Mid",
    CM: "Center Mid",
    WM: "Wide Mid",
    AM: "Attacking Mid",
    ST: "Striker",
    WR: "Winger",
} as const;

export const PositionShortLabels: Record<Position, string> = {
    GK: "GK",
    CB: "CB",
    FB: "FB",
    DM: "DM",
    CM: "CM",
    WM: "WM",
    AM: "AM",
    ST: "ST",
    WR: "WR",
} as const;

export type Zone = "goalkeeper" | "defense" | "midfield" | "attack";

export const ZoneKeys: Zone[] = [
    "goalkeeper",
    "defense",
    "midfield",
    "attack",
] as const;

export const ZoneLabels: Record<Zone, string> = {
    goalkeeper: "Goalkeeper",
    defense: "Defense",
    midfield: "Midfield",
    attack: "Attack",
} as const;

export const ZonePositions: Record<Zone, Position[]> = {
    goalkeeper: ["GK"],
    defense: ["CB", "FB"],
    midfield: ["DM", "CM", "WM", "AM"],
    attack: ["ST", "WR"],
} as const;

export type PositionWeighting = {
    positionName: string;
    zone: Zone;
    shortName: string;
    weights: Record<StatsKey, number>; // missing values = 0
    isCentral: boolean;
    absoluteYPosition: number;
    priorityStat: number;
};

export type PositionWeightingAndIndex = {
    position: PositionWeighting,
    positionKey: Position,
};

export type ZoneScores = Record<Position, number>;
export type Weighting = Record<Position, PositionWeighting>;

export const emptyZoneScores: ZoneScores = {
    GK: 0, CB: 0, FB: 0, DM: 0, CM: 0, WM: 0, AM: 0, ST: 0, WR: 0
} as const;

export const defaultZoneWeights: Weighting = {
    GK: {
        positionName: "Goalkeeper",
        shortName: "GK",
        zone: "goalkeeper",
        weights: {
            defensiveAwareness: 950,
            pressResistance: 200,
            offTheBall: 0,
            vision: 150,
            firstTouch: 200,
            shortPassing: 200,
            tackling: 0,
            finishing: 0,
            speed: 200,
            strength: 300,
            agility: 500,
            defensiveWorkrate: 250,
            crossing: 0,
            attackPositioning: 0,
            longPassing: 200,
            dribbling: 50,
            ballCarrying: 50,
            interceptions: 300,
            blocking: 800,
            heading: 0,
            aggression: 400,
            attackingWorkrate: 0,
            teamwork: 0,
            positivity: 0,
            willingToSwitch: 0,
            communication: 0,
        },
        isCentral: true,
        absoluteYPosition: 1.0,
        priorityStat: 0,
    },

    CB: {
        positionName: "Center Back",
        shortName: "CB",
        zone: "defense",
        weights: {
            defensiveAwareness: 900,
            pressResistance: 100,
            offTheBall: 0,
            vision: 0,
            firstTouch: 0,
            shortPassing: 100,
            tackling: 1000,
            finishing: 0,
            speed: 0,
            strength: 850,
            agility: 0,
            defensiveWorkrate: 500,
            crossing: 0,
            attackPositioning: 0,
            longPassing: 50,
            dribbling: 0,
            ballCarrying: 0,
            interceptions: 400,
            blocking: 900,
            heading: 800,
            aggression: 500,
            attackingWorkrate: 0,
            teamwork: 0,
            positivity: 0,
            willingToSwitch: 0,
            communication: 0,
        },
        isCentral: true,
        absoluteYPosition: 0.7,
        priorityStat: 1,
    },

    FB: {
        positionName: "Full Back",
        shortName: "FB",
        zone: "defense",
        weights: {
            defensiveAwareness: 650,
            pressResistance: 100,
            offTheBall: 50,
            vision: 0,
            firstTouch: 50,
            shortPassing: 200,
            tackling: 600,
            finishing: 0,
            speed: 500,
            strength: 300,
            agility: 50,
            defensiveWorkrate: 900,
            crossing: 300,
            attackPositioning: 200,
            longPassing: 50,
            dribbling: 100,
            ballCarrying: 250,
            interceptions: 600,
            blocking: 500,
            heading: 50,
            aggression: 300,
            attackingWorkrate: 0,
            teamwork: 0,
            positivity: 0,
            willingToSwitch: 0,
            communication: 0,
        },
        isCentral: false,
        absoluteYPosition: 0.65,
        priorityStat: 2,
    },

    DM: {
        positionName: "Defensive Midfield",
        shortName: "DM",
        zone: "midfield",
        weights: {
            defensiveAwareness: 600,
            pressResistance: 1000,
            offTheBall: 0,
            vision: 200,
            firstTouch: 200,
            shortPassing: 600,
            tackling: 450,
            finishing: 0,
            speed: 10,
            strength: 400,
            agility: 0,
            defensiveWorkrate: 500,
            crossing: 0,
            attackPositioning: 0,
            longPassing: 400,
            dribbling: 100,
            ballCarrying: 250,
            interceptions: 600,
            blocking: 10,
            heading: 50,
            aggression: 450,
            attackingWorkrate: 0,
            teamwork: 0,
            positivity: 0,
            willingToSwitch: 0,
            communication: 0,
        },
        isCentral: true,
        absoluteYPosition: 0.5,
        priorityStat: 1,
    },

    CM: {
        positionName: "Central Midfield",
        shortName: "CM",
        zone: "midfield",
        weights: {
            defensiveAwareness: 400,
            pressResistance: 700,
            offTheBall: 100,
            vision: 600,
            firstTouch: 400,
            shortPassing: 700,
            tackling: 100,
            finishing: 0,
            speed: 50,
            strength: 300,
            agility: 300,
            defensiveWorkrate: 200,
            crossing: 0,
            attackPositioning: 200,
            longPassing: 600,
            dribbling: 300,
            ballCarrying: 600,
            interceptions: 300,
            blocking: 0,
            heading: 50,
            aggression: 200,
            attackingWorkrate: 0,
            teamwork: 0,
            positivity: 0,
            willingToSwitch: 0,
            communication: 0,
        },
        isCentral: true,
        absoluteYPosition: 0.4,
        priorityStat: 3,
    },

    WM: {
        positionName: "Wide Midfielder",
        shortName: "WM",
        zone: "midfield",
        weights: {
            defensiveAwareness: 200,
            pressResistance: 300,
            offTheBall: 500,
            vision: 50,
            firstTouch: 400,
            shortPassing: 400,
            tackling: 200,
            finishing: 0,
            speed: 750,
            strength: 150,
            agility: 300,
            defensiveWorkrate: 450,
            crossing: 600,
            attackPositioning: 300,
            longPassing: 300,
            dribbling: 400,
            ballCarrying: 500,
            interceptions: 250,
            blocking: 0,
            heading: 0,
            aggression: 200,
            attackingWorkrate: 200,
            teamwork: 0,
            positivity: 0,
            willingToSwitch: 0,
            communication: 0,
        },
        isCentral: false,
        absoluteYPosition: 0.35,
        priorityStat: 4,
    },

    AM: {
        positionName: "Attacking Midfield",
        shortName: "AM",
        zone: "midfield",
        weights: {
            defensiveAwareness: 100,
            pressResistance: 400,
            offTheBall: 200,
            vision: 1000,
            firstTouch: 700,
            shortPassing: 1000,
            tackling: 0,
            finishing: 150,
            speed: 50,
            strength: 200,
            agility: 300,
            defensiveWorkrate: 0,
            crossing: 50,
            attackPositioning: 300,
            longPassing: 300,
            dribbling: 600,
            ballCarrying: 300,
            interceptions: 0,
            blocking: 0,
            heading: 0,
            aggression: 10,
            attackingWorkrate: 500,
            teamwork: 0,
            positivity: 0,
            willingToSwitch: 0,
            communication: 0,
        },
        isCentral: true,
        absoluteYPosition: 0.3,
        priorityStat: 2,
    },

    ST: {
        positionName: "Striker",
        shortName: "ST",
        zone: "attack",
        weights: {
            defensiveAwareness: 0,
            pressResistance: 200,
            offTheBall: 900,
            vision: 0,
            firstTouch: 800,
            shortPassing: 350,
            tackling: 0,
            finishing: 1000,
            speed: 250,
            strength: 500,
            agility: 400,
            defensiveWorkrate: 0,
            crossing: 0,
            attackPositioning: 800,
            longPassing: 0,
            dribbling: 450,
            ballCarrying: 0,
            interceptions: 0,
            blocking: 0,
            heading: 200,
            aggression: 500,
            attackingWorkrate: 500,
            teamwork: 0,
            positivity: 0,
            willingToSwitch: 0,
            communication: 0,
        },

        isCentral: true,
        absoluteYPosition: 0.15,
        priorityStat: 1,
    },

    WR: {
        positionName: "Winger",
        shortName: "WR",
        zone: "attack",
        weights: {
            defensiveAwareness: 0,
            pressResistance: 50,
            offTheBall: 500,
            vision: 350,
            firstTouch: 500,
            shortPassing: 400,
            tackling: 0,
            finishing: 100,
            speed: 900,
            strength: 200,
            agility: 800,
            defensiveWorkrate: 10,
            crossing: 1000,
            attackPositioning: 400,
            longPassing: 0,
            dribbling: 800,
            ballCarrying: 300,
            interceptions: 0,
            blocking: 0,
            heading: 0,
            aggression: 0,
            attackingWorkrate: 600,
            teamwork: 0,
            positivity: 0,
            willingToSwitch: 0,
            communication: 0,
        },

        isCentral: false,
        absoluteYPosition: 0.175,
        priorityStat: 2,
    },
} as const;



export type Formation = {
    name: string;
    positions: ZoneScores;
};

export const formationTemplates: Record<number, Formation[]> = {
    5: [
        {
            name: "1-2-1",
            positions: { GK: 1, CB: 1, FB: 0, DM: 0, CM: 2, WM: 0, AM: 0, ST: 1, WR: 0 }
        }
    ],
    6: [
        {
            name: "2-2-1",
            positions: { GK: 1, CB: 2, FB: 0, DM: 0, CM: 2, WM: 0, AM: 0, ST: 1, WR: 0 }
        }
    ],
    7: [
        {
            name: "2-3-1",
            positions: { GK: 1, CB: 2, FB: 0, DM: 1, CM: 0, WM: 0, AM: 2, ST: 1, WR: 0 }
        },
        {
            name: "3-2-1",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 1, ST: 1, WR: 0 }
        },
    ],
    8: [
        {
            name: "3-3-1",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 2, ST: 1, WR: 0 }
        },
        {
            name: "2-4-1",
            positions: { GK: 1, CB: 2, FB: 0, DM: 1, CM: 0, WM: 2, AM: 1, ST: 1, WR: 0 }
        },
    ],
    9: [
        {
            name: "3-3-2",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 2, ST: 2, WR: 0 }
        },
        {
            name: "3-4-1",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 2, AM: 1, ST: 1, WR: 0 }
        },
    ],
    10: [
        // {
        //     name: "4-4-1",
        //     positions: { GK: 1, CB: 2, FB: 2, DM: 0, CM: 0, WM: 2, AM: 2, ST: 1, WR: 0 }
        // },
        {
            name: "3-3-3",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 2, ST: 1, WR: 2 }
        },
    ],
    11: [
        // {
        //     name: "4-3-3 (2)",
        //     positions: { GK: 1, CB: 2, FB: 2, DM: 0, CM: 2, WM: 0, AM: 1, ST: 1, WR: 2 }
        // },
        {
            name: "3-5-2",
            positions: { GK: 1, CB: 3, FB: 0, DM: 2, CM: 0, WM: 2, AM: 1, ST: 2, WR: 0 }
        },
        {
            name: "3-4-3",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 3, ST: 1, WR: 2 }
        },
        // {
        //     name: "3-3-4",
        //     positions: { GK: 1, CB: 3, FB: 0, DM: 2, CM: 0, WM: 0, AM: 1, ST: 2, WR: 2 }
        // },
        // {
        //     name: " 4-1-2-1-2",
        //     positions: { GK: 1, CB: 2, FB: 2, DM: 1, CM: 0, WM: 2, AM: 1, ST: 2, WR: 0 }
        // },
    ],
    12: [
        // {
        //     name: "4-3-4",
        //     positions: { GK: 1, CB: 2, FB: 2, DM: 1, CM: 0, WM: 0, AM: 2, ST: 2, WR: 2 }
        // },
        {
            name: "3-5-3(2)",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 2, AM: 2, ST: 1, WR: 2 }
        },
        // {
        //     name: "3-4-4",
        //     positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 3, ST: 2, WR: 2 }
        // },
    ],
} as const;

export const normalizeWeights = (zoneWeights: Weighting): Weighting => {
    let normalized = structuredClone(zoneWeights);

    for (const [_, posWeighting] of Object.entries(normalized)) {
        const total = statKeys.reduce(
            (sum, key) => sum + (posWeighting.weights[key] ?? 0),
            0
        );

        for (const key of statKeys) {
            const val = (posWeighting.weights[key] ?? 0) / total;
            posWeighting.weights[key] = val;
        }
    }
    return normalized;
};

export const normalizedDefaultWeights = normalizeWeights(defaultZoneWeights);

export type Point = { x: number, y: number, };

const getXForPlayerPosition = (position: PositionWeighting, positionIndex: number, numPositionentries: number) => {
    if (!position.isCentral) {
        if (positionIndex >= 2) throw new Error(`More than 2 players in ${position.positionName} position?`);
        return positionIndex + (0.075 * (positionIndex ? -1 : 1));
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
    const zonePositions: PositionWeightingAndIndex[] = [];

    let copyWeights = structuredClone(defaultZoneWeights);

    for (const zoneKey in copyWeights) {
        const zone = zoneKey as keyof ZoneScores;
        const positionMap = copyWeights[zone];

        zonePositions.push({
            position: positionMap,
            positionKey: zone
        });
    }

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


export const getThreatScore = (point: Point, playerScores: ZoneScores) => {
    const proximityPositions = getProximityPositions(point);

    // Normalize weights to sum to 1
    const sum = proximityPositions.reduce((acc, w) => acc + w.weight, 0);
    proximityPositions.forEach((position) => {
        position.weight = position.weight / sum;
    });

    const threat = proximityPositions.reduce((acc, w) => {
        const score = playerScores[w.positionKey];

        return acc + (score * w.weight / 100);
    }, 0);

    return threat;

};