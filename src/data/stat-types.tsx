
export type StatsKey =
    | "defensiveAwareness"
    | "pressResistance"
    | "offTheBall"
    | "vision"
    | "firstTouch"
    | "shortPassing"
    | "tackling"
    | "finishing"
    | "speed"
    | "strength"
    | "agility"
    | "defensiveWorkrate"
    | "crossing"
    | "attackPositioning"
    | "longPassing"
    | "dribbling"
    | "ballCarrying"
    | "interceptions"
    | "blocking"
    | "heading"
    | "aggression"
    | "attackingWorkrate"
    | "teamwork"
    | "positivity"
    | "willingToSwitch"
    | "communication";

export const statKeys: StatsKey[] = [
    "defensiveAwareness",
    "pressResistance",
    "offTheBall",
    "vision",
    "firstTouch",
    "shortPassing",
    "tackling",
    "finishing",
    "speed",
    "strength",
    "agility",
    "defensiveWorkrate",
    "crossing",
    "attackPositioning",
    "longPassing",
    "dribbling",
    "ballCarrying",
    "interceptions",
    "blocking",
    "heading",
    "aggression",
    "attackingWorkrate",
    "teamwork",
    "positivity",
    "willingToSwitch",
    "communication"
] as const;

export const statLabelMap: Record<StatsKey, string> = {
    defensiveAwareness: "Defensive Awareness",
    pressResistance: "Press Resistance",
    offTheBall: "Off the Ball Movement",
    vision: "Vision",
    firstTouch: "First Touch",
    shortPassing: "Short Passing",
    tackling: "Tackling",
    finishing: "Finishing",
    speed: "Speed",
    strength: "Strength",
    agility: "Agility",
    defensiveWorkrate: "Defensive Work Rate",
    crossing: "Crossing",
    attackPositioning: "Attacking Positioning",
    longPassing: "Long Passing",
    dribbling: "Dribbling (Close Control)",
    ballCarrying: "Carrying (Progressive  Runs)",
    interceptions: "Interceptions",
    blocking: "Blocking",
    heading: "Heading",
    aggression: "Aggression",
    attackingWorkrate: "Attacking Work Rate",
    teamwork: "Teamwork",
    positivity: "Positivity",
    willingToSwitch: "Willing to Switch",
    communication: "Communication",
} as const;


export const statShortLabelMap: Record<StatsKey, string> = {
    defensiveAwareness: "DAW",
    pressResistance: "PRS",
    offTheBall: "OTB",
    vision: "VIS",
    firstTouch: "FTC",
    shortPassing: "PAS",
    tackling: "TAC",
    finishing: "FIN",
    speed: "SPD",
    strength: "STR",
    agility: "AGI",
    defensiveWorkrate: "DWR",
    crossing: "CRS",
    attackPositioning: "APO",
    longPassing: "LPA",
    dribbling: "DRI",
    ballCarrying: "BCR",
    interceptions: "INT",
    blocking: "BLK",
    heading: "HDG",
    aggression: "AGR",
    attackingWorkrate: "AWR",
    teamwork: "TMW",
    positivity: "POS",
    willingToSwitch: "WTS",
    communication: "COM",
} as const;

export const statColorsMap: Record<StatsKey, string> = {
    defensiveAwareness: "bg-orange-600",
    pressResistance: "bg-yellow-500",
    offTheBall: "bg-orange-400",
    vision: "bg-yellow-600",
    firstTouch: "bg-indigo-500",
    shortPassing: "bg-pink-500",
    tackling: "bg-blue-600",
    finishing: "bg-red-500",
    speed: "bg-emerald-500",
    strength: "bg-green-600",
    agility: "bg-lime-500",
    defensiveWorkrate: "bg-green-400",
    crossing: "bg-sky-400",
    attackPositioning: "bg-rose-500",
    longPassing: "bg-cyan-500",
    dribbling: "bg-purple-500",
    ballCarrying: "bg-teal-400",
    interceptions: "bg-indigo-400",
    blocking: "bg-blue-400",
    heading: "bg-violet-500",
    aggression: "bg-red-600",
    attackingWorkrate: "bg-amber-500",
    teamwork: "bg-fuchsia-400",
    positivity: "bg-emerald-400",
    willingToSwitch: "bg-pink-400",
    communication: "bg-yellow-400",
} as const;

export type PlayerStats = Record<StatsKey, number>;

export const defaultStatScores: PlayerStats = Object.fromEntries(
    ([
        "defensiveAwareness",
        "pressResistance",
        "offTheBall",
        "vision",
        "firstTouch",
        "shortPassing",
        "tackling",
        "finishing",
        "speed",
        "strength",
        "agility",
        "defensiveWorkrate",
        "crossing",
        "attackPositioning",
        "longPassing",
        "dribbling",
        "ballCarrying",
        "interceptions",
        "blocking",
        "heading",
        "aggression",
        "attackingWorkrate",
        "teamwork",
        "positivity",
        "willingToSwitch",
        "communication",
    ] as const).map((key) => [key, 50])
) as PlayerStats;


export type StatCategory = 'pace' | 'attacking' | 'passing' | "dribbling" | "defending" | "physical" | "morale";

export const StatCategoryKeys: StatCategory[] = [
    "pace",
    "attacking",
    "passing",
    "dribbling",
    "defending",
    "physical",
    "morale"
] as const;

export const StatCategoryNameMap: Record<StatCategory, string> = {
    pace: "Pace",
    attacking: "Attacking",
    passing: "Passing",
    dribbling: "Dribbling",
    defending: "Defending",
    physical: "Physical",
    morale: "Morale",
} as const;


export const CategorizedStats: Record<StatCategory, StatsKey[]> = {
    pace: [
        "speed",
    ],
    attacking: [
        "finishing",
        "attackPositioning",
        "offTheBall",
        "attackingWorkrate",
    ],
    passing: [
        "shortPassing",
        "longPassing",
        "vision",
        "crossing",
    ],
    dribbling: [
        "dribbling",
        "ballCarrying",
        "agility",
        "firstTouch",
        "pressResistance",
    ],
    defending: [
        "defensiveAwareness",
        "tackling",
        "interceptions",
        "blocking",
        "defensiveWorkrate",
    ],
    physical: [
        "strength",
        "aggression",
        "heading",
    ],
    morale: [
        "teamwork",
        "positivity",
        "willingToSwitch",
        "communication",
    ],
} as const;