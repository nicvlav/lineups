export const attributeLabels = [
    "Defending",
    "Attacking",
    "Speed",
    "Tactical",
    "Passing",
    "Shooting",
    "Dribbling",
    "Physicality"
] as const;

export const attributeShortLabels = [
    "DEF",
    "ATT",
    "SPE",
    "TAC",
    "PAS",
    "SHO",
    "DRI",
    "PHY"
] as const;

export const attributeColors = [
    "bg-blue-600",    // DEF (Defending) - Strong, reliable blue
    "bg-red-600",     // ATT (Attacking) - Aggressive, fiery red
    "bg-emerald-500", // SPE (Athleticism) - Vibrant, energetic green
    "bg-orange-500",  // TAC (Tactical) - Strategic, calculated orange
    "bg-pink-500",    // PAS (Creativity) - Imaginative, playful pink
    "bg-blue-600",    // SHO (Defending) - Strong, reliable blue
    "bg-indigo-500",  // DRI (Attacking) - Skillful, creative indigo
    "bg-emerald-500", // PHY (Athleticism) - Vibrant, energetic green
] as const;

export type attributeScores = [
    DEF: number,
    ATT: number,
    ATH: number,
    TAC: number,
    PAS: number,
    SHO: number,
    DRI: number,
    PHY: number
];

export const defaultAttributeScores: attributeScores = [50, 50, 50, 50, 50, 50, 50, 50,] as attributeScores;


export type PositionWeighting = {
    positionName: string,
    positionShortName: string,
    weighting: attributeScores,
    isCentral: boolean,
    relativeYPosition: number,
    priorityStat: number;
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

// attributeScores (weighting): "DEF", "ATT", "SPE", "TAC", "PAS", SHO DRI PHY
export const defaultZoneWeights: Weighting = [
    [
        {
            positionName: "Goalkeeper",
            positionShortName: "GK",
            weighting: [100, 0, 0, 0, 0, 0, 0, 0], // High defense, reflexes, positioning
            isCentral: true,
            relativeYPosition: 1.0, // Always the furthest back
            priorityStat: 0,
        },
    ],
    // Defense
    [
        {
            positionName: "Center Back",
            positionShortName: "CB",
            weighting: [100, 0, 0, 30, 10, 0, 0, 50], // Example values: high defense, moderate physicality
            isCentral: true,
            relativeYPosition: 1.0, // Furthest back
            priorityStat: 3,
        },
        {
            positionName: "Full Back",
            positionShortName: "FB",
            weighting: [100, 20, 30, 10, 0, 0, 0, 50], // More balanced defensive + attacking capability
            isCentral: false,
            relativeYPosition: 0.7, // Slightly forward compared to CB
            priorityStat: 1,
        }
    ],
    // Midfield // attributeScores (weighting): "DEF", "ATT", "SPE", "TAC", "PAS"     SHO DRI PHY
    [
        {
            positionName: "Defensive Midfield",
            positionShortName: "DM",
            weighting: [100, 10, 10, 60, 60, 10, 40, 80], // Strong tactical and defense
            isCentral: true,
            relativeYPosition: 1.0, // Always the furthest back
            priorityStat: 3,
        },
        {
            positionName: "Wide Midfielder",
            positionShortName: "WM",
            weighting: [40, 90, 60, 20, 60, 30, 60, 65], // Higher athleticism and attack
            isCentral: false,
            relativeYPosition: 0.5, // Slightly forward compared to CB
            priorityStat: 1,
        },
        {
            positionName: "Attacking Midfield",
            positionShortName: "AM", 
            weighting: [20, 100, 50, 50, 100, 50, 100, 30], // Strong attack and creativity
            isCentral: true,
            relativeYPosition: 0.4, // Higher up the pitch
            priorityStat: 2,
        }
    ],
    // Attack
    [
        {
            positionName: "Striker",
            positionShortName: "ST",
            weighting: [0, 100, 50, 20, 20, 100, 50, 80], // High technicality for scoring, lower creativity
            isCentral: true,
            relativeYPosition: 0.5, // Always the furthest back
            priorityStat: 3,
        },
        {
            positionName: "Winger",
            positionShortName: "WR",
            weighting: [0, 100, 100, 10, 60, 50, 90, 20], // High athleticism and creativity
            isCentral: false,
            relativeYPosition: 0.7, // Furthest back
            priorityStat: 1,
        }
    ]
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
            positions: [[1], [3, 0], [2, 0, 0], [1, 0]] 
        },
    ],
    8: [
        {
            name: "3-3-1",
            positions: [[1], [3, 0], [1, 2, 0], [1, 0]] 
        },
        {
            name: "2-4-1",
            positions: [[1], [2, 0], [2, 2, 0], [1, 0]] 
        },
    ],
    9: [
        {
            name: "3-3-2",
            positions: [[1], [3, 0], [1, 2, 0], [2, 0]] 
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
            positions: [[1], [3, 0], [1, 2, 0], [1, 2]]
        },
    ],
    11: [
        {
            name: "4-3-3",
            positions: [[1], [2, 2], [1, 0, 2], [1, 2]]
        },
        {
            name: "4-3-3 (2)",
            positions: [[1], [2, 2], [2, 0, 1], [1, 2]]
        }, {
            name: "3-5-2",
            positions: [[1], [3, 0], [2, 2, 1], [2, 0]]
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
            name: "4-5-2",
            positions: [[1], [2, 2], [2, 2, 1], [2, 0]]
        },
    ],

} as const;