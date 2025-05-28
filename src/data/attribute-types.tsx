
export const enum AttributeIndex {
    Positioning = 0,
    Awareness,
    OffTheBall,
    DecisionMaking,
    FirstTouch,
    Passing,
    Tackling,
    Finishing,
    Speed,
    Strength,
    Agility,
    Endurance,
};


export const mentalIndexes = [
    AttributeIndex.Positioning,
    AttributeIndex.Awareness,
    AttributeIndex.OffTheBall,
    AttributeIndex.DecisionMaking,
] as const;

export const technicalIndexes = [
    AttributeIndex.FirstTouch,
    AttributeIndex.Passing,
    AttributeIndex.Tackling,
    AttributeIndex.Finishing,
] as const;

export const physicalIndexes = [
    AttributeIndex.Speed,
    AttributeIndex.Strength,
    AttributeIndex.Agility,
    AttributeIndex.Endurance,
] as const;

export const enum CategoryIndex {
    Mental = 0,
    Technical,
    Physical,
};

export const categoryNames = [
    "Mental",
    "Technical",
    "Physical"
] as const;

/*
I really need to rework my whole flat simple array values into more robust records or labelled arrays of some kind
this is trying to shoehorn in more c++ style array + enum logic but surely this can be better in a more javascript way

I feel like the below could be pretty decent 

export const attributeLabels2: Record<AttributeIndex, String> = {
    [AttributeIndex.Positioning]: "Positioning Awareness",
    [AttributeIndex.Awareness]: "Scanning & Situational",
    [AttributeIndex.OffTheBall]: "Off-the-ball Movement",
    [AttributeIndex.DecisionMaking]: "Decision-making Under Pressure",
    [AttributeIndex.FirstTouch]: "First Touch & Control",
    [AttributeIndex.Passing]: "Passing & Vision",
    [AttributeIndex.Tackling]: "Tackling / Ball Winning",
    [AttributeIndex.Finishing]: "Finishing",
    [AttributeIndex.Speed]: "Speed & Acceleration",
    [AttributeIndex.Strength]: "Strength & Balance",
    [AttributeIndex.Agility]: "Agility & Recovery",
    [AttributeIndex.Endurance]: "Work Rate & Endurance"
} as const;

I just need to make this change to all arrays like this and update my auto balance algorithm

*/



// MENTAL & TACTICAL INTELLIGENCE
export const attributeLabels = [
    "Positioning Awareness",
    "Scanning & Press Resistance",
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
            weighting: [100, 10, 10, 30, 45, 50, 85, 30, 55, 90, 40, 70],
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
            weighting: [90, 10, 0, 25, 0, 45, 100, 0, 5, 70, 10, 0],
            isCentral: true,
            absoluteYPosition: 0.7,
            priorityStat: 0, // Positioning
        },
        {
            positionName: "Full Back",
            positionShortName: "FB",
            weighting: [55, 20, 20, 40, 40, 40, 90, 0, 75, 60, 75, 80],
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
            weighting: [85, 100, 40, 85, 50, 70, 90, 5, 30, 80, 20, 50],
            isCentral: true,
            absoluteYPosition: 0.55,
            priorityStat: 6, // Tackling
        },
        {
            positionName: "Wide Midfielder",
            positionShortName: "WM",
            weighting: [40, 45, 60, 40, 60, 70, 55, 20, 80, 55, 75, 100],
            isCentral: false,
            absoluteYPosition: 0.45,
            priorityStat: 10, // Agility & Recovery
        },
        {
            positionName: "Attacking Midfield",
            positionShortName: "AM",
            weighting: [30, 65, 60, 75, 90, 100, 20, 65, 60, 50, 85, 50],
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
            weighting: [30, 50, 90, 50, 70, 25, 5, 100, 60, 85, 40, 60],
            isCentral: true,
            absoluteYPosition: 0.2,
            priorityStat: 2, // Off-the-ball Movement
        },
        {
            positionName: "Winger",
            positionShortName: "WR",
            weighting: [10, 30, 75, 60, 80, 55, 10, 70, 100, 35, 90, 70],
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