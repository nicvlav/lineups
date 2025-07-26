import { StatsKey } from "@/data/stat-types"; // Importing from shared file

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
    weights: Partial<Record<StatsKey, number>>; // missing values = 0
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
            positioning: 100,
            pressResistance: 0,
            offTheBall: 0,
            decisionMaking: 0,
            firstTouch: 0,
            passing: 0,
            tackling: 0,
            finishing: 0,
            speed: 0,
            strength: 0,
            agility: 50,
            workRate: 0,
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
            positioning: 50,
            pressResistance: 5,
            offTheBall: 0,
            decisionMaking: 5,
            firstTouch: 0,
            passing: 0,
            tackling: 100,
            finishing: 0,
            speed: 0,
            strength: 50,
            agility: 0,
            workRate: 0,
        },
        isCentral: true,
        absoluteYPosition: 0.7,
        priorityStat: 5,
    },
    FB: {
        positionName: "Full Back",
        shortName: "FB",
        zone: "defense",
        weights: {
            positioning: 40,
            pressResistance: 0,
            offTheBall: 10,
            decisionMaking: 0,
            firstTouch: 5,
            passing: 5,
            tackling: 100,
            finishing: 0,
            speed: 20,
            strength: 20,
            agility: 0,
            workRate: 30,
        },
        isCentral: false,
        absoluteYPosition: 0.65,
        priorityStat: 1,
    },

    DM: {
        positionName: "Defensive Midfield",
        shortName: "DM",
        zone: "midfield",
        weights: {
            positioning: 75,
            pressResistance: 70,
            offTheBall: 0,
            decisionMaking: 50,
            firstTouch: 20,
            passing: 20,
            tackling: 70,
            finishing: 0,
            speed: 0,
            strength: 40,
            agility: 0,
            workRate: 20,
        },
        isCentral: true,
        absoluteYPosition: 0.55,
        priorityStat: 6,
    },
    CM: {
        positionName: "Defensive Midfield",
        shortName: "DM",
        zone: "midfield",
        weights: {
            positioning: 60,
            pressResistance: 100,
            offTheBall: 0,
            decisionMaking: 80,
            firstTouch: 40,
            passing: 70,
            tackling: 30,
            finishing: 0,
            speed: 0,
            strength: 20,
            agility: 0,
            workRate: 20,
        },
        isCentral: true,
        absoluteYPosition: 0.50,
        priorityStat: 6,
    },
    WM: {
        positionName: "Wide Midfielder",
        shortName: "WM",
        zone: "midfield",
        weights: {
            positioning: 20,
            pressResistance: 40,
            offTheBall: 30,
            decisionMaking: 10,
            firstTouch: 20,
            passing: 50,
            tackling: 30,
            finishing: 0,
            speed: 70,
            strength: 30,
            agility: 60,
            workRate: 80,
        },
        isCentral: false,
        absoluteYPosition: 0.40,
        priorityStat: 10,
    },
    AM: {
        positionName: "Attacking Midfield",
        shortName: "AM",
        zone: "midfield",
        weights: {
            positioning: 20,
            pressResistance: 50,
            offTheBall: 60,
            decisionMaking: 90,
            firstTouch: 90,
            passing: 100,
            tackling: 10,
            finishing: 20,
            speed: 50,
            strength: 30,
            agility: 60,
            workRate: 30,
        },
        isCentral: true,
        absoluteYPosition: 0.35,
        priorityStat: 5,
    },
    ST: {
        positionName: "Striker",
        shortName: "ST",
        zone: "attack",
        weights: {
            positioning: 10,
            pressResistance: 10,
            offTheBall: 90,
            decisionMaking: 40,
            firstTouch: 70,
            passing: 10,
            tackling: 0,
            finishing: 100,
            speed: 30,
            strength: 80,
            agility: 50,
            workRate: 40,
        },
        isCentral: true,
        absoluteYPosition: 0.2,
        priorityStat: 2,
    },
    WR: {
        positionName: "Winger",
        shortName: "WR",
        zone: "attack",
        weights: {
            positioning: 0,
            pressResistance: 20,
            offTheBall: 75,
            decisionMaking: 60,
            firstTouch: 80,
            passing: 60,
            tackling: 0,
            finishing: 50,
            speed: 100,
            strength: 0,
            agility: 90,
            workRate: 40,
        },
        isCentral: false,
        absoluteYPosition: 0.25,
        priorityStat: 10,
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
            name: "2-1-2",
            positions: { GK: 1, CB: 2, FB: 0, DM: 1, CM: 0, WM: 0, AM: 0, ST: 2, WR: 0 }
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
        {
            name: "4-4-1",
            positions: { GK: 1, CB: 2, FB: 2, DM: 0, CM: 0, WM: 2, AM: 2, ST: 1, WR: 0 }
        },
        {
            name: "3-3-3",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 2, ST: 1, WR: 2 }
        },
    ],
    11: [
        {
            name: "4-3-3 (2)",
            positions: { GK: 1, CB: 2, FB: 2, DM: 0, CM: 2, WM: 0, AM: 1, ST: 1, WR: 2 }
        },
        {
            name: "3-5-2",
            positions: { GK: 1, CB: 3, FB: 0, DM: 2, CM: 0, WM: 2, AM: 1, ST: 2, WR: 0 }
        },
        {
            name: "3-4-3",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 3, ST: 1, WR: 2 }
        },
        {
            name: "3-3-4",
            positions: { GK: 1, CB: 3, FB: 0, DM: 0, CM: 2, WM: 0, AM: 1, ST: 2, WR: 2 }
        },
        {
            name: " 4-1-2-1-2",
            positions: { GK: 1, CB: 2, FB: 2, DM: 1, CM: 0, WM: 2, AM: 1, ST: 2, WR: 0 }
        },
    ],
    12: [
        {
            name: "4-3-4",
            positions: { GK: 1, CB: 2, FB: 2, DM: 1, CM: 0, WM: 0, AM: 2, ST: 2, WR: 2 }
        },
        {
            name: "3-5-3(2)",
            positions: { GK: 1, CB: 3, FB: 0, DM: 0, CM: 2, WM: 0, AM: 3, ST: 1, WR: 2 }
        },
        {
            name: "3-4-4",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 3, ST: 2, WR: 2 }
        },
    ],
} as const;

export const normalizeWeights = (zoneWeights: Weighting): Weighting => {
    let normalized = structuredClone(zoneWeights);

    for (const zoneKey in zoneWeights) {
        const zone = zoneKey as keyof ZoneScores;
        const positionMap = zoneWeights[zone];


        let score = 0;
        for (const attr in positionMap.weights) {
            const attrKey = attr as StatsKey;
            const weight = positionMap.weights[attrKey];
            score += weight ? weight : 0;
        }

        for (const attr in positionMap.weights) {
            const attrKey = attr as StatsKey;
            if (positionMap.weights[attrKey]) positionMap.weights[attrKey] /= score;
        }

    }

    return normalized;
};


export type Point = { x: number, y: number, };

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