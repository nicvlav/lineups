
export type StatsKey =
    | 'positioning'
    | 'pressResistance'
    | 'offTheBall'
    | 'decisionMaking'
    | 'firstTouch'
    | 'passing'
    | 'tackling'
    | 'finishing'
    | 'speed'
    | 'strength'
    | 'agility'
    | 'workRate';

export const statKeys: StatsKey[] = [
    "positioning",
    "pressResistance",
    "offTheBall",
    "decisionMaking",
    "firstTouch",
    "passing",
    "tackling",
    "finishing",
    "speed",
    "strength",
    "agility",
    "workRate"
] as const;

export const statLabelMap: Record<StatsKey, string> = {
    positioning: "Positioning",
    pressResistance: "Press Resistance",
    offTheBall: "Off the Ball",
    decisionMaking: "Decision Making",
    firstTouch: "First Touch",
    passing: "Passing",
    tackling: "Tackling",
    finishing: "Finishing",
    speed: "Speed",
    strength: "Strength",
    agility: "Agility",
    workRate: "Work Rate",
} as const;

export const statShortLabelMap: Record<StatsKey, string> = {
    positioning: "POS",
    pressResistance: "RES",
    offTheBall: "OTB",
    decisionMaking: "DEC",
    firstTouch: "FTC",
    passing: "PAS",
    tackling: "TAC",
    finishing: "FIN",
    speed: "SPE",
    strength: "STR",
    agility: "AGI",
    workRate: "WRK",
} as const;

export const statColorsMap: Record<StatsKey, string> = {
    positioning: "bg-orange-600",
    pressResistance: "bg-yellow-500",
    offTheBall: "bg-orange-400",
    decisionMaking: "bg-yellow-600",
    firstTouch: "bg-indigo-500",
    passing: "bg-pink-500",
    tackling: "bg-blue-600",
    finishing: "bg-red-500",
    speed: "bg-emerald-500",
    strength: "bg-green-600",
    agility: "bg-lime-500",
    workRate: "bg-green-400",
} as const;

export type PlayerStats = Record<StatsKey, number>;

export const defaultStatScores: PlayerStats = {
    positioning: 50,
    pressResistance: 50,
    offTheBall: 50,
    decisionMaking: 50,
    firstTouch: 50,
    passing: 50,
    tackling: 50,
    finishing: 50,
    speed: 50,
    strength: 50,
    agility: 50,
    workRate: 50,
} as const;


export type StatCategory = 'physical' | 'technical' | 'mental';

export const StatCategoryNameMap: Record<StatCategory, string> = {
    physical: "Physical",
    technical: "Technical",
    mental: "Mental",
} as const;

export const CategorizedStats: Record<StatCategory, StatsKey[]> = {
    physical: ["strength", "agility", "workRate", "speed"],
    technical: ["passing", "firstTouch", "tackling", "finishing"],
    mental: ["positioning", "decisionMaking", "offTheBall", "pressResistance"],
} as const;
