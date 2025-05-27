// MENTAL & TACTICAL INTELLIGENCE
export const attributeLabels = [
    "Positioning Awareness",
    "Scanning & Situational Awareness",
    "Off-the-ball Movement",
    "Decision-making Under Pressure",

    // TECHNICAL EXECUTION
    "First Touch & Control",
    "Passing & Vision",
    "Tackling / Ball Winning",
    "Finishing",

    // PHYSICAL & ATHLETIC PROFILE
    "Speed & Acceleration",
    "Strength & Balance",
    "Agility & Recovery",
    "Work Rate & Endurance"
] as const;

export const attributeShortLabels = [
    // MENTAL & TACTICAL INTELLIGENCE
    "POS",
    "SCAN",
    "MOV",
    "DEC",

    // TECHNICAL EXECUTION
    "FTC",
    "PAS",
    "TAC",
    "FIN",

    // PHYSICAL & ATHLETIC PROFILE
    "SPD",
    "STR",
    "AGI",
    "WRK"
] as const;

export const attributeColors = [
    // MENTAL & TACTICAL INTELLIGENCE - oranges/yellows
    "bg-orange-600", // POS
    "bg-yellow-500", // SCAN
    "bg-orange-400", // MOV
    "bg-yellow-600", // DEC

    // TECHNICAL EXECUTION - blues/pinks
    "bg-indigo-500", // FTC
    "bg-pink-500",   // PAS
    "bg-blue-600",   // TAC
    "bg-red-500",    // FIN

    // PHYSICAL & ATHLETIC PROFILE - greens
    "bg-emerald-500", // SPD
    "bg-green-600",   // STR
    "bg-lime-500",    // AGI
    "bg-green-400"    // WRK
] as const;

export type attributeScores = [
    POS: number,
    SCA: number,
    MOV: number,
    DEC: number,

    FTC: number,
    PAS: number,
    TAC: number,
    FIN: number,

    SPD: number,
    STR: number,
    AGI: number,
    WRK: number
];

export const defaultAttributeScores: attributeScores = [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50] as attributeScores;


export type PositionWeighting = {
    positionName: string,
    positionShortName: string,
    weighting: attributeScores,
    isCentral: boolean,
    absoluteYPosition: number,
    priorityStat: number;
};

export type PositionWeightingAndIndex = {
    position: PositionWeighting,
    originalFlatZoneIndex: number,
};

export const weightingShortLabels = [
    {
        name: "Goalkeeper",
        positions: ["GK"]
    },
    {
        name: "Defense",
        positions: ["CB", "FB"]
    },
    {
        name: "Midfield",
        positions: ["DM", "WM", "AM"]
    },
    {
        name: "Attack",
        positions: ["ST", "WR"]
    }
] as const;

export const weightingLabels = [
    {
        name: "Goalkeeper",
        positions: ["Goalkeeper"]
    },
    {
        name: "Defense",
        positions: ["Center Back", "Full Back"]
    },
    {
        name: "Midfield",
        positions: ["Defensive Midfield", "Wide Midfield", "Attacking Midfield"]
    },
    {
        name: "Attack",
        positions: ["Striker", "Winger"]
    }
] as const;

// hardcode our zone scores to be a static number of positions
export type Weighting = [
    GK: [
        GK: PositionWeighting
    ],
    defense: [
        CB: PositionWeighting,
        FB: PositionWeighting,
    ],
    midifield: [
        DM: PositionWeighting,
        WM: PositionWeighting,
        AM: PositionWeighting
    ],
    attack: [
        ST: PositionWeighting,
        WR: PositionWeighting
    ]
];

export type ZoneScores = [
    defense: [
        GK: number
    ],
    defense: [
        CB: number,
        FB: number
    ],
    midifield: [
        DM: number,
        WM: number,
        AM: number
    ],
    attack: [
        ST: number,
        WR: number
    ]
];

export const emptyZoneScores: ZoneScores = [
    [0], // defense
    [0, 0], // defense
    [0, 0, 0],// midfield
    [0, 0]// attack
] as const;

// Attribute index reference (12 total):
//  0 - Positioning Awareness
//  1 - Scanning & Situational Awareness
//  2 - Off-the-ball Movement
//  3 - Decision-making Under Pressure
//  4 - First Touch & Control
//  5 - Passing & Vision
//  6 - Tackling / Ball Winning
//  7 - Finishing / Ball Retention
//  8 - Speed & Acceleration
//  9 - Strength & Balance
// 10 - Agility & Recovery
// 11 - Work Rate & Endurance

export const defaultZoneWeights: Weighting = [
    // Goalkeeper
    [
        {
            positionName: "Goalkeeper",
            positionShortName: "GK",
            weighting: [100, 85, 40, 65, 45, 50, 85, 30, 55, 90, 40, 70],
            isCentral: true,
            absoluteYPosition: 1.0,
            priorityStat: 0, // Positioning
        },
    ],
    // Defenders
    [
        {
            positionName: "Center Back",
            positionShortName: "CB",
            weighting: [100, 60, 35, 65, 40, 45, 90, 10, 45, 95, 35, 60],
            isCentral: true,
            absoluteYPosition: 0.7,
            priorityStat: 0, // Positioning
        },
        {
            positionName: "Full Back",
            positionShortName: "FB",
            weighting: [90, 85, 50, 55, 60, 60, 75, 25, 85, 60, 75, 80],
            isCentral: false,
            absoluteYPosition: 0.65,
            priorityStat: 1, // Scanning/Awareness
        },
    ],
    // Midfield
    [
        {
            positionName: "Defensive Midfield",
            positionShortName: "DM",
            weighting: [85, 80, 45, 65, 50, 85, 100, 25, 55, 80, 60, 75],
            isCentral: true,
            absoluteYPosition: 0.55,
            priorityStat: 6, // Tackling
        },
        {
            positionName: "Wide Midfielder",
            positionShortName: "WM",
            weighting: [65, 85, 60, 55, 60, 80, 55, 35, 80, 55, 100, 85],
            isCentral: false,
            absoluteYPosition: 0.45,
            priorityStat: 10, // Agility & Recovery
        },
        {
            positionName: "Attacking Midfield",
            positionShortName: "AM",
            weighting: [65, 85, 70, 75, 90, 100, 40, 65, 70, 50, 75, 70],
            isCentral: true,
            absoluteYPosition: 0.4,
            priorityStat: 5, // Passing & Vision
        },
    ],
    // Attack
    [
        {
            positionName: "Striker",
            positionShortName: "ST",
            weighting: [45, 55, 100, 60, 70, 50, 5, 95, 70, 85, 40, 60],
            isCentral: true,
            absoluteYPosition: 0.2,
            priorityStat: 2, // Off-the-ball Movement
        },
        {
            positionName: "Winger",
            positionShortName: "WR",
            weighting: [50, 70, 90, 60, 85, 65, 10, 70, 95, 35, 100, 85],
            isCentral: false,
            absoluteYPosition: 0.25,
            priorityStat: 10, // Agility
        },
    ],
] as const;


export type Point = { x: number, y: number, };

export type Formation = {
    name: string;
    positions: ZoneScores;
};

// Store formations with the number of players as a key
export const formationTemplates: Record<number, Formation[]> = {
    5: [
        {
            name: "1-2-1",
            positions: [[1], [1, 0], [2, 0, 0], [1, 0]]
        },
    ],
    6: [
        {
            name: " 2-1-2",
            positions: [[1], [2, 0], [1, 0, 0], [2, 0]]
        },
        {
            name: " 2-2-1",
            positions: [[1], [2, 0], [2, 0, 0], [1, 0]]
        },
    ],
    7: [
        {
            name: "2-3-1",
            positions: [[1], [2, 0], [1, 0, 2], [1, 0]]
        },
        {
            name: "3-2-1",
            positions: [[1], [3, 0], [1, 0, 1], [1, 0]]
        },
    ],
    8: [
        {
            name: "3-3-1",
            positions: [[1], [3, 0], [1, 0, 2], [1, 0]]
        },
        {
            name: "2-4-1",
            positions: [[1], [2, 0], [1, 2, 1], [1, 0]]
        },
    ],
    9: [
        {
            name: "3-3-2",
            positions: [[1], [3, 0], [1, 0, 2], [2, 0]]
        },
        {
            name: "3-4-1",
            positions: [[1], [3, 0], [1, 2, 1], [1, 0]]
        },
    ],
    10: [
        {
            name: "4-4-1",
            positions: [[1], [2, 2], [0, 2, 2], [1, 0]]
        },
        {
            name: "3-3-3",
            positions: [[1], [3, 0], [1, 0, 2], [1, 2]]
        },
    ],
    11: [
        {
            name: "4-3-3 (2)",
            positions: [[1], [2, 2], [2, 0, 1], [1, 2]]
        },
        {
            name: "3-5-2",
            positions: [[1], [3, 0], [2, 2, 1], [2, 0]]
        },
        {
            name: "3-4-3",
            positions: [[1], [3, 0], [1, 0, 3], [1, 2]]
        },
        {
            name: "3-3-4",
            positions: [[1], [3, 0], [2, 0, 1], [2, 2]]
        },
        {
            name: " 4-1-2-1-2",
            positions: [[1], [2, 2], [1, 2, 1], [2, 0]]
        },
    ],
    12: [
        {
            name: "4-3-4",
            positions: [[1], [2, 2], [1, 0, 2], [2, 2]]
        },
        {
            name: "3-5-3(2)",
            positions: [[1], [3, 0], [2, 0, 3], [1, 2]]
        },
        {
            name: "3-4-4",
            positions: [[1], [3, 0], [1, 0, 3], [2, 2]]
        },
    ],

} as const;

export const normalizeWeights = (zoneWeights: Weighting): Weighting => {
    return zoneWeights.map(zoneArray =>
        zoneArray.map(positionObject => {
            const sum = positionObject.weighting.reduce((acc, w) => acc + w, 0);
            const normalizedWeights = positionObject.weighting.map(w => w / sum);
            return { ...positionObject, weighting: normalizedWeights }; // Return new object
        })
    ) as Weighting;
};