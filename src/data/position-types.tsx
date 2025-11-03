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
            // Technical
            passing: 200,
            firstTouch: 200,
            crossing: 0,
            dribbling: 50,
            technique: 100,
            finishing: 0,
            longShots: 0,

            // Tactical
            anticipation: 1000,
            interceptions: 0,
            vision: 300,
            positioning: 600,
            offTheBall: 0,
            decisions: 300,
            marking: 300,
            tackling: 0,
            workrate: 0,

            // Mental
            composure: 400,
            concentration: 600,
            determination: 50,
            leadership: 100,
            teamwork: 200,
            aggression: 0,
            flair: 0,

            // Physical
            speed: 0,
            strength: 300,
            agility: 150,
            stamina: 50,
            heading: 0,
        },
        isCentral: true,
        absoluteYPosition: 1.0,
        priorityStat: 10,
    },

    CB: {
        positionName: "Center Back",
        shortName: "CB",
        zone: "defense",
        weights: {
            // Technical
            passing: 150,
            firstTouch: 100,
            crossing: 0,
            dribbling: 0,
            technique: 0,
            finishing: 0,
            longShots: 0,

            // Tactical
            anticipation: 1000,
            interceptions: 600,
            vision: 100,
            positioning: 600,
            offTheBall: 0,
            decisions: 300,
            marking: 900,
            tackling: 1000,
            workrate: 50,

            // Mental
            composure: 250,
            concentration: 400,
            determination: 300,
            leadership: 400,
            teamwork: 200,
            aggression: 400,
            flair: 0,

            // Physical
            speed: 100,
            strength: 400,
            agility: 0,
            stamina: 50,
            heading: 400,
        },
        isCentral: true,
        absoluteYPosition: 0.675,
        priorityStat: 1,
    },

    FB: {
        positionName: "Full Back",
        shortName: "FB",
        zone: "defense",
        weights: {
            // Technical
            passing: 100,
            firstTouch: 200,
            crossing: 150,
            dribbling: 100,
            technique: 50,
            finishing: 0,
            longShots: 0,

            // Tactical
            anticipation: 500,
            interceptions: 600,
            vision: 100,
            positioning: 300,
            offTheBall: 50,
            decisions: 200,
            marking: 500,
            tackling: 600,
            workrate: 700,

            // Mental
            composure: 200,
            concentration: 150,
            determination: 300,
            leadership: 0,
            teamwork: 300,
            aggression: 100,
            flair: 0,

            // Physical
            speed: 100,
            strength: 100,
            agility: 50,
            stamina: 700,
            heading: 10,
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
            // Technical
            passing: 800,
            firstTouch: 500,
            crossing: 0,
            dribbling: 50,
            technique: 200,
            finishing: 0,
            longShots: 10,

            // Tactical
            anticipation: 1000,
            interceptions: 900,
            vision: 350,
            positioning: 600,
            offTheBall: 100,
            decisions: 700,
            marking: 300,
            tackling: 300,
            workrate: 200,

            // Mental
            composure: 1000,
            concentration: 400,
            determination: 200,
            leadership: 600,
            teamwork: 400,
            aggression: 20,
            flair: 0,

            // Physical
            speed: 0,
            strength: 50,
            agility: 0,
            stamina: 100,
            heading: 10,
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
            // Technical
            passing: 1000,
            firstTouch: 350,
            crossing: 0,
            dribbling: 50,
            technique: 200,
            finishing: 0,
            longShots: 50,

            // Tactical
            anticipation: 400,
            interceptions: 250,
            vision: 400,
            positioning: 250,
            offTheBall: 25,
            decisions: 550,
            marking: 5,
            tackling: 50,
            workrate: 350,

            // Mental
            composure: 1000,
            concentration: 300,
            determination: 200,
            leadership: 225,
            teamwork: 300,
            aggression: 5,
            flair: 0,

            // Physical
            speed: 50,
            strength: 5,
            agility: 5,
            stamina: 600,
            heading: 5,
        },
        isCentral: true,
        absoluteYPosition: 0.45,
        priorityStat: 2,
    },

    WM: {
        positionName: "Wide Midfielder",
        shortName: "WM",
        zone: "midfield",
        weights: {
            // Technical
            passing: 500,
            firstTouch: 200,
            crossing: 1000,
            dribbling: 200,
            technique: 200,
            finishing: 100,
            longShots: 30,

            // Tactical
            anticipation: 250,
            interceptions: 75,
            vision: 100,
            positioning: 150,
            offTheBall: 150,
            decisions: 200,
            marking: 25,
            tackling: 25,
            workrate: 650,

            // Mental
            composure: 300,
            concentration: 150,
            determination: 200,
            leadership: 0,
            teamwork: 600,
            aggression: 5,
            flair: 15,

            // Physical
            speed: 400,
            strength: 5,
            agility: 25,
            stamina: 650,
            heading: 0,
        },
        isCentral: false,
        absoluteYPosition: 0.4,
        priorityStat: 6,
    },

    AM: {
        positionName: "Attacking Midfield",
        shortName: "AM",
        zone: "midfield",
        weights: {
            // Technical
            passing: 1000,
            firstTouch: 600,
            crossing: 5,
            dribbling: 350,
            technique: 600,
            finishing: 50,
            longShots: 50,

            // Tactical
            anticipation: 600,
            interceptions: 50,
            vision: 1000,
            positioning: 100,
            offTheBall: 50,
            decisions: 400,
            marking: 0,
            tackling: 0,
            workrate: 400,

            // Mental
            composure: 1000,
            concentration: 150,
            determination: 300,
            leadership: 5,
            teamwork: 300,
            aggression: 5,
            flair: 50,

            // Physical
            speed: 200,
            strength: 5,
            agility: 100,
            stamina: 300,
            heading: 0,
        },
        isCentral: true,
        absoluteYPosition: 0.325,
        priorityStat: 1,
    },

    ST: {
        positionName: "Striker",
        shortName: "ST",
        zone: "attack",
        weights: {
            // Technical
            passing: 250,
            firstTouch: 650,
            crossing: 0,
            dribbling: 200,
            technique: 300,
            finishing: 1000,
            longShots: 15,

            // Tactical
            anticipation: 700,
            interceptions: 25,
            vision: 200,
            positioning: 1000,
            offTheBall: 800,
            decisions: 300,
            marking: 0,
            tackling: 0,
            workrate: 300,

            // Mental
            composure: 1000,
            concentration: 200,
            determination: 200,
            leadership: 5,
            teamwork: 200,
            aggression: 100,
            flair: 50,

            // Physical
            speed: 100,
            strength: 400,
            agility: 50,
            stamina: 300,
            heading: 100,
        },
        isCentral: true,
        absoluteYPosition: 0.175,
        priorityStat: 1,
    },

    WR: {
        positionName: "Winger",
        shortName: "WR",
        zone: "attack",
        weights: {
            // Technical
            passing: 300,
            firstTouch: 750,
            crossing: 1000,
            dribbling: 800,
            technique: 500,
            finishing: 300,
            longShots: 25,

            // Tactical
            anticipation: 250,
            interceptions: 25,
            vision: 225,
            positioning: 200,
            offTheBall: 600,
            decisions: 300,
            marking: 0,
            tackling: 0,
            workrate: 400,

            // Mental
            composure: 200,
            concentration: 150,
            determination: 150,
            leadership: 0,
            teamwork: 300,
            aggression: 150,
            flair: 200,

            // Physical
            speed: 600,
            strength: 5,
            agility: 400,
            stamina: 300,
            heading: 25,
        },
        isCentral: false,
        absoluteYPosition: 0.2,
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
        {
            name: "3-2-1-1 (CM+AM)",
            positions: { GK: 1, CB: 3, FB: 0, DM: 0, CM: 1, WM: 0, AM: 1, ST: 1, WR: 0 }
        },
    ],
    8: [
        // {
        //     name: "3-3-1",
        //     positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 2, ST: 1, WR: 0 }
        // },
        {
            name: "2-4-1",
            positions: { GK: 1, CB: 2, FB: 0, DM: 1, CM: 0, WM: 0, AM: 1, ST: 1, WR: 2 }
        },
        {
            name: "2-2-3",
            positions: { GK: 1, CB: 2, FB: 0, DM: 1, CM: 1, WM: 0, AM: 0, ST: 1, WR: 2 }
        },
    ],
    9: [
        {
            name: "3-2-3",
            positions: { GK: 1, CB: 3, FB: 0, DM: 0, CM: 2, WM: 0, AM: 0, ST: 1, WR: 2 }
        },
        {
            name: "3-4-1",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 3, WM: 0, AM: 0, ST: 1, WR: 0 }
        },
        {
            name: "3-3-2",
            positions: { GK: 1, CB: 3, FB: 0, DM: 0, CM: 2, WM: 0, AM: 1, ST: 2, WR: 0 }
        },
    ],
    10: [
        {
            name: "3-5-1",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 2, WM: 0, AM: 0, ST: 1, WR: 2 }
        },
        {
            name: "3-4-2",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 3, WM: 0, AM: 0, ST: 2, WR: 0 }
        },
        {
            name: "3-3-3",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 2, WM: 0, AM: 0, ST: 1, WR: 2 }
        },
    ],
    11: [
        // {
        //     name: "4-3-3",
        //     positions: { GK: 1, CB: 2, FB: 2, DM: 1, CM: 2, WM: 0, AM: 0, ST: 1, WR: 2 }
        // },
        // {
        //     name: "4-3-3 (2)",
        //     positions: { GK: 1, CB: 2, FB: 2, DM: 0, CM: 2, WM: 0, AM: 1, ST: 1, WR: 2 }
        // },
        // {
        //     name: "4-4-2",
        //     positions: { GK: 1, CB: 2, FB: 2, DM: 0, CM: 2, WM: 2, AM: 0, ST: 2, WR: 0 }
        // },
        // {
        //     name: "3-4-3",
        //     positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 2, AM: 1, ST: 1, WR: 2 }
        // },
        {
            name: "3-6-1",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 3, ST: 1, WR: 2 }
        },
        {
            name: "3-4-3",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 3, ST: 1, WR: 2 }
        },
        // {
        //     name: "3-3-4",
        //     positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 2, WM: 0, AM: 0, ST: 2, WR: 2 }
        // },
    ],
    12: [
        // {
        //     name: "3-5-3",
        //     positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 2, WM: 2, AM: 0, ST: 1, WR: 2 }
        // },
        {
            name: "3-5-3 (1)",
            positions: { GK: 1, CB: 3, FB: 0, DM: 0, CM: 3, WM: 0, AM: 2, ST: 1, WR: 2 }
        },
        {
            name: "3-5-3 (2)",
            positions: { GK: 1, CB: 3, FB: 0, DM: 2, CM: 0, WM: 0, AM: 3, ST: 1, WR: 2 }
        },
        {
            name: "3-5-3 (3)",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 2, AM: 2, ST: 1, WR: 2 }
        },
        // {
        //     name: "3-4-4",
        //     positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 2, AM: 1, ST: 2, WR: 2 }
        // },
        // {
        //     name: "3-5-3",
        //     positions: { GK: 1, CB: 3, FB: 0, DM: 0, CM: 2, WM: 0, AM: 3, ST: 1, WR: 2 }
        // },
    ],
    13: [
        // {
        //     name: "3-5-3",
        //     positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 2, WM: 2, AM: 0, ST: 1, WR: 2 }
        // },
        {
            name: "3-5-4",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 2, AM: 2, ST: 2, WR: 2 }
        },
        // {
        //     name: "3-4-4",
        //     positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 2, AM: 1, ST: 2, WR: 2 }
        // },
        // {
        //     name: "3-5-3",
        //     positions: { GK: 1, CB: 3, FB: 0, DM: 0, CM: 2, WM: 0, AM: 3, ST: 1, WR: 2 }
        // },
    ],
} as const;

export const normalizeWeights = (zoneWeights: Weighting): Weighting => {
    const normalized = structuredClone(zoneWeights);

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
    const spacing = 0.4 / (numPositionentries); // Max width for players

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

export const getPointForPosition = (position: PositionWeighting, positionIndex: number, numPositionentries: number, formation?: Formation) => {
    let yPosition = position.absoluteYPosition;

    // Special CM positioning logic when formation is provided
    if (formation && position.shortName === "CM") {
        const hasDM = formation.positions.DM > 0;
        const hasAM = formation.positions.AM > 0;
        const hasCM = formation.positions.CM > 0;

        // Count total central midfield positions (not including WM which is wide)
        const centralMidCount = (hasDM ? 1 : 0) + (hasAM ? 1 : 0) + (hasCM ? 1 : 0);

        if (centralMidCount === 1) {
            // Solo CM (no other central mids): use ideal center position
            yPosition = 0.45;
        } else if (hasDM && hasAM) {
            // Should not happen according to rules, but fallback to default
            yPosition = position.absoluteYPosition;
        } else if (hasDM && !hasAM) {
            // CM + DM: shift CM toward attack to avoid overlap with DM (0.5 -> 0.45)
            yPosition = 0.35;
        } else if (hasAM && !hasDM) {
            // CM + AM: shift CM toward defense to avoid overlap with AM (0.5 -> 0.55) 
            yPosition = 0.5;
        } else {
            // Fallback to default
            yPosition = position.absoluteYPosition;
        }
    }

    return {
        x: getXForPlayerPosition(position, positionIndex, numPositionentries),
        y: yPosition
    } as Point;
};

const getProximityPositions = (point: Point) => {
    const zonePositions: PositionWeightingAndIndex[] = [];

    const copyWeights = structuredClone(defaultZoneWeights);

    for (const zoneKey in copyWeights) {
        const zone = zoneKey as keyof ZoneScores;
        const positionMap = copyWeights[zone];

        zonePositions.push({
            position: positionMap,
            positionKey: zone
        });
    }

    const centrals = filterByVerticalProximity(zonePositions.filter((zone) => zone.position.isCentral), point.y);
    const wides = filterByVerticalProximity(zonePositions.filter((zone) => !zone.position.isCentral), point.y);

    const weights = [...centrals, ...wides].map(position => {
        return { ...position, weight: getProximityScore(point, position.position) };
    });

    weights.filter((position) => position.weight > 0).sort((a, b) => b.weight - a.weight);

    if (weights.length > 0 && weights[0].weight == 1) {
        return weights.slice(0, 1);
    }

    return weights;
};


export const getThreatScore = (point: Point, playerScores: ZoneScores, exactPosition?: Position | null) => {
    // If we have an exact position, return the score for that position directly
    if (exactPosition) {
        return playerScores[exactPosition] / 100;
    }

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