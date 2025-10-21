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
            anticipation: 950,           // was defensiveAwareness
            composure: 200,
            offTheBall: 0,
            vision: 150,
            firstTouch: 200,
            passing: 200,                // was shortPassing + longPassing
            tackling: 0,
            finishing: 0,
            speed: 0,
            strength: 300,
            agility: 150,
            workrate: 0,               // was defensiveWorkrate
            crossing: 0,
            positioning: 0,              // was attackPositioning
            technique: 100,              // new: ball control
            dribbling: 50,
            decisions: 300,              // was interceptions
            marking: 800,                // was blocking
            heading: 0,
            aggression: 0,
            flair: 0,
            longShots: 0,
            stamina: 50,
            teamwork: 200,
            determination: 50,
            leadership: 100,
            concentration: 600,          // KEY STAT for GK - one lapse = goal
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
            anticipation: 1000,          // was defensiveAwareness
            composure: 50,
            offTheBall: 0,
            vision: 0,
            firstTouch: 5,
            passing: 25,                // was shortPassing + longPassing
            tackling: 1000,
            finishing: 0,
            speed: 0,
            strength: 400,
            agility: 0,
            workrate: 25,               // was defensiveWorkrate
            crossing: 0,
            positioning: 250,              // was attackPositioning
            technique: 0,               // new: ball control
            dribbling: 0,
            decisions: 150,              // was interceptions
            marking: 850,                // was blocking
            heading: 400,
            aggression: 400,
            flair: 0,
            longShots: 0,
            stamina: 50,
            teamwork: 50,
            determination: 100,
            leadership: 300,             // KEY STAT for CB - defensive leader
            concentration: 300,
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
            anticipation: 500,           // was defensiveAwareness
            composure: 5,
            offTheBall: 50,
            vision: 0,
            firstTouch: 5,
            passing: 100,                // was shortPassing + longPassing
            tackling: 600,
            finishing: 0,
            speed: 100,
            strength: 5,
            agility: 5,
            workrate: 600,               // was defensiveWorkrate + attackingWorkrate
            crossing: 150,
            positioning: 50,            // was attackPositioning
            technique: 0,              // new
            dribbling: 100,
            decisions: 25,              // was interceptions
            marking: 500,                // was blocking
            heading: 10,
            aggression: 100,
            flair: 0,
            longShots: 0,
            stamina: 600,                // KEY STAT for FB - runs up and down all game
            teamwork: 300,
            determination: 300,
            leadership: 0,
            concentration: 5,
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
            anticipation: 1000,           // was defensiveAwareness
            composure: 1000,
            offTheBall: 10,
            vision: 350,
            firstTouch: 500,
            passing: 800,                // was shortPassing + longPassing
            tackling: 300,
            finishing: 0,
            speed: 0,
            strength: 50,
            agility: 0,
            workrate: 200,               // was defensiveWorkrate
            crossing: 0,
            positioning: 0,              // was attackPositioning
            technique: 200,              // new: ball control
            dribbling: 50,
            decisions: 700,              // was interceptions
            marking: 10,                 // was blocking
            heading: 10,
            aggression: 20,
            flair: 0,
            longShots: 10,
            stamina: 100,
            teamwork: 400,
            determination: 200,
            leadership: 600,
            concentration: 400,
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
            anticipation: 100,           // was defensiveAwareness
            composure: 1000,
            offTheBall: 25,
            vision: 400,
            firstTouch: 300,
            passing: 1000,               // was shortPassing + longPassing
            tackling: 50,
            finishing: 0,
            speed: 50,
            strength: 5,
            agility: 5,
            workrate: 400,               // was defensiveWorkrate + attackingWorkrate
            crossing: 0,
            positioning: 15,             // was attackPositioning
            technique: 200,              // new: ball control
            dribbling: 50,
            decisions: 600,              // was interceptions
            marking: 5,                  // was blocking
            heading: 0,
            aggression: 5,
            flair: 0,
            longShots: 50,
            stamina: 600,                // KEY STAT for CM - box to box running
            teamwork: 350,
            determination: 200,
            leadership: 300,
            concentration: 300,
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
            anticipation: 150,           // was defensiveAwareness
            composure: 300,
            offTheBall: 150,
            vision: 0,
            firstTouch: 50,
            passing: 300,                // was shortPassing + longPassing
            tackling: 25,
            finishing: 0,
            speed: 450,
            strength: 5,
            agility: 50,
            workrate: 650,               // was defensiveWorkrate + attackingWorkrate
            crossing: 800,
            positioning: 150,            // was attackPositioning
            technique: 25,              // new
            dribbling: 200,
            decisions: 200,              // was interceptions
            marking: 25,                  // was blocking
            heading: 0,
            aggression: 5,
            flair: 15,
            longShots: 30,
            stamina: 650,                // KEY STAT for WM - running up and down wing
            teamwork: 500,
            determination: 200,
            leadership: 0,
            concentration: 15,
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
            anticipation: 50,            // was defensiveAwareness
            composure: 1000,
            offTheBall: 50,
            vision: 1000,
            firstTouch: 600,
            passing: 800,               // was shortPassing + longPassing
            tackling: 0,
            finishing: 25,
            speed: 5,
            strength: 0,
            agility: 100,
            workrate: 650,               // was defensiveWorkrate + attackingWorkrate
            crossing: 5,
            positioning: 100,            // was attackPositioning
            technique: 650,              // new: ball control, very important
            dribbling: 350,
            decisions: 0,                // was interceptions
            marking: 0,                  // was blocking
            heading: 0,
            aggression: 5,
            flair: 50,                  // KEY STAT for AM - creativity/playmaking
            longShots: 50,
            stamina: 150,
            teamwork: 300,
            determination: 50,
            leadership: 5,
            concentration: 50,
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
            anticipation: 400,             // was defensiveAwareness
            composure: 1000,
            offTheBall: 800,
            vision: 50,
            firstTouch: 600,
            passing: 50,                // was shortPassing + longPassing
            tackling: 0,
            finishing: 1000,
            speed: 100,
            strength: 400,
            agility: 50,
            workrate: 300,               // was defensiveWorkrate + attackingWorkrate
            crossing: 0,
            positioning: 1000,           // was attackPositioning
            technique: 300,              // new: ball control
            dribbling: 50,
            decisions: 200,                // was interceptions
            marking: 0,                  // was blocking
            heading: 100,
            aggression: 100,
            flair: 50,
            longShots: 15,
            stamina: 100,
            teamwork: 100,
            determination: 200,          // KEY STAT for ST - never give up attitude
            leadership: 5,
            concentration: 200,
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
            anticipation: 5,             // was defensiveAwareness
            composure: 150,
            offTheBall: 600,
            vision: 100,
            firstTouch: 550,
            passing: 100,                // was shortPassing + longPassing
            tackling: 0,
            finishing: 50,
            speed: 900,
            strength: 0,
            agility: 600,
            workrate: 600,               // was defensiveWorkrate + attackingWorkrate
            crossing: 1000,
            positioning: 300,            // was attackPositioning
            technique: 400,              // new: ball control, important for wingers
            dribbling: 800,
            decisions: 25,                // was interceptions
            marking: 0,                  // was blocking
            heading: 0,
            aggression: 0,
            flair: 300,                  // KEY STAT for WR - creativity/trickery
            longShots: 25,
            stamina: 300,
            teamwork: 50,
            determination: 150,
            leadership: 0,
            concentration: 10,
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
        {
            name: "3-3-1",
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 0, WM: 0, AM: 2, ST: 1, WR: 0 }
        },
        {
            name: "2-4-1",
            positions: { GK: 1, CB: 2, FB: 0, DM: 1, CM: 0, WM: 2, AM: 1, ST: 1, WR: 0 }
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
            positions: { GK: 1, CB: 3, FB: 0, DM: 1, CM: 2, WM: 2, AM: 0, ST: 1, WR: 0 }
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
            name: "3-5-3",
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