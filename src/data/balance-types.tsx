import { GamePlayer, AttributeScores } from "@/data/player-types"; // Importing from shared file

export type PositionWeighting = {
    positionName: string,
    positionShortName: string,
    weighting: AttributeScores,
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

// AttributeScores (weighting): "DEF", "ATT", "SPE", "TAC", "PAS", SHO DRI PHY
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
            weighting: [100, 0, 10, 60, 10, 0, 0, 80], // Example values: high defense, moderate physicality
            isCentral: true,
            relativeYPosition: 1.0, // Furthest back
            priorityStat: 3,
        },
        {
            positionName: "Full Back",
            positionShortName: "FB",
            weighting: [70, 30, 70, 30, 0, 0, 20, 40], // More balanced defensive + attacking capability
            isCentral: false,
            relativeYPosition: 0.7, // Slightly forward compared to CB
            priorityStat: 1,
        }
    ],
    // Midfield // AttributeScores (weighting): "DEF", "ATT", "SPE", "TAC", "PAS"     SHO DRI PHY
    [
        {
            positionName: "Defensive Midfield",
            positionShortName: "DM",
            weighting: [80, 20, 30, 85, 20, 10, 40, 80], // Strong tactical and defense
            isCentral: true,
            relativeYPosition: 1.0, // Always the furthest back
            priorityStat: 3,
        },
        {
            positionName: "Wide Midfielder",
            positionShortName: "WM",
            weighting: [40, 80, 80, 30, 60, 40, 60, 65], // Higher athleticism and attack
            isCentral: false,
            relativeYPosition: 0.5, // Slightly forward compared to CB
            priorityStat: 1,
        },
        {
            positionName: "Attacking Midfield",
            positionShortName: "AM", // Wing Back
            weighting: [20, 90, 50, 40, 100, 65, 80, 40], // Strong attack and creativity
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
            weighting: [0, 100, 50, 50, 20, 100, 55, 85], // High technicality for scoring, lower creativity
            isCentral: true,
            relativeYPosition: 0.5, // Always the furthest back
            priorityStat: 3,
        },
        {
            positionName: "Winger",
            positionShortName: "WR",
            weighting: [0, 100, 80, 20, 70, 50, 85, 45], // High athleticism and creativity
            isCentral: false,
            relativeYPosition: 0.7, // Furthest back
            priorityStat: 1,
        }
    ]
] as const;

export const formationTemplates: Record<number, ZoneScores[]> = {
    5: [
        [[1], [2, 0], [2, 0, 0], [1, 0]], // 2-2-1
        [[1], [1, 0], [2, 0, 0], [1, 0]], // 1-2-1
    ],
    6: [
        [[1], [2, 0], [1, 0, 0], [2, 0]], // 2-1-2
        [[1], [2, 0], [2, 0, 0], [1, 0]], // 2-2-1
    ],
    7: [
        [[1], [2, 0], [1, 0, 2], [1, 0]], // 2-3-1
        [[1], [3, 0], [2, 0, 0], [1, 0]], // 3-2-1
    ],
    8: [
        [[1], [3, 0], [1, 2, 0], [1, 0]], // 3-3-1
        [[1], [2, 0], [2, 2, 0], [1, 0]], // 2-4-1
    ],
    9: [
        [[1], [3, 0], [0, 1, 2], [2, 0]], // 3-3-2
        [[1], [3, 0], [1, 0, 2], [1, 0]], // 3-4-1
    ],
    10: [
        [[1], [2, 2], [0, 2, 2], [1, 0]],// 4-4-1
        [[1], [3, 0], [1, 2, 0], [1, 2]], // 3-3-3
    ],
    11: [
        [[1], [2, 2], [1, 0, 2], [1, 2]], // 4-3-3
        [[1], [2, 2], [2, 0, 1], [1, 2]], // 4-3-3 (2)
        [[1], [3, 0], [2, 2, 1], [2, 0]], // 3-5-2
        [[1], [2, 2], [1, 2, 1], [2, 0]], // 4-1-2-1-2
    ],
    12: [
        [[1], [2, 2], [1, 0, 2], [2, 2]], // 4-3-4
        [[1], [2, 2], [2, 2, 1], [2, 0]], // 4-5-2
    ],
} as const;
export interface FilledGamePlayer extends GamePlayer {
    real_name: string,
    stats: AttributeScores,
}
export interface ScoredGamePlayer extends FilledGamePlayer {
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