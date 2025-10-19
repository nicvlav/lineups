
export type StatsKey =
    | "anticipation"
    | "composure"
    | "offTheBall"
    | "vision"
    | "firstTouch"
    | "passing"
    | "tackling"
    | "finishing"
    | "speed"
    | "strength"
    | "agility"
    | "workrate"
    | "crossing"
    | "positioning"
    | "technique"
    | "dribbling"
    | "decisions"
    | "marking"
    | "heading"
    | "aggression"
    | "flair"
    | "longShots"
    | "stamina"
    | "teamwork"
    | "determination"
    | "leadership"
    | "concentration";

export const statKeys: StatsKey[] = [
    "anticipation",
    "composure",
    "offTheBall",
    "vision",
    "firstTouch",
    "passing",
    "tackling",
    "finishing",
    "speed",
    "strength",
    "agility",
    "workrate",
    "crossing",
    "positioning",
    "technique",
    "dribbling",
    "decisions",
    "marking",
    "heading",
    "aggression",
    "flair",
    "longShots",
    "stamina",
    "teamwork",
    "determination",
    "leadership",
    "concentration"
] as const;

export const statLabelMap: Record<StatsKey, string> = {
    anticipation: "Anticipation",
    composure: "Composure",
    offTheBall: "Off the Ball",
    vision: "Vision",
    firstTouch: "First Touch",
    passing: "Passing",
    tackling: "Tackling",
    finishing: "Finishing",
    speed: "Speed",
    strength: "Strength",
    agility: "Agility",
    workrate: "Work Rate",
    crossing: "Crossing",
    positioning: "Positioning",
    technique: "Technique",
    dribbling: "Dribbling",
    decisions: "Decisions",
    marking: "Marking",
    heading: "Heading",
    aggression: "Aggression",
    flair: "Flair",
    longShots: "Long Shots",
    stamina: "Stamina",
    teamwork: "Teamwork",
    determination: "Determination",
    leadership: "Leadership",
    concentration: "Concentration",
} as const;


export const statShortLabelMap: Record<StatsKey, string> = {
    anticipation: "ANT",
    composure: "CMP",
    offTheBall: "OTB",
    vision: "VIS",
    firstTouch: "FTC",
    passing: "PAS",
    tackling: "TAC",
    finishing: "FIN",
    speed: "SPD",
    strength: "STR",
    agility: "AGI",
    workrate: "WOR",
    crossing: "CRS",
    positioning: "POS",
    technique: "TEC",
    dribbling: "DRI",
    decisions: "DEC",
    marking: "MAR",
    heading: "HDG",
    aggression: "AGR",
    flair: "FLA",
    longShots: "LSH",
    stamina: "STA",
    teamwork: "TEA",
    determination: "DET",
    leadership: "LEA",
    concentration: "CON",
} as const;

export const statColorsMap: Record<StatsKey, string> = {
    anticipation: "bg-orange-600",
    composure: "bg-yellow-500",
    offTheBall: "bg-orange-400",
    vision: "bg-yellow-600",
    firstTouch: "bg-indigo-500",
    passing: "bg-pink-500",
    tackling: "bg-blue-600",
    finishing: "bg-red-500",
    speed: "bg-emerald-500",
    strength: "bg-green-600",
    agility: "bg-lime-500",
    workrate: "bg-green-400",
    crossing: "bg-sky-400",
    positioning: "bg-rose-500",
    technique: "bg-purple-400",
    dribbling: "bg-purple-500",
    decisions: "bg-indigo-400",
    marking: "bg-blue-400",
    heading: "bg-violet-500",
    aggression: "bg-red-600",
    flair: "bg-amber-500",
    longShots: "bg-orange-400",
    stamina: "bg-yellow-400",
    teamwork: "bg-fuchsia-400",
    determination: "bg-emerald-400",
    leadership: "bg-pink-400",
    concentration: "bg-cyan-400",
} as const;

export type PlayerStats = Record<StatsKey, number>;

export const defaultStatScores: PlayerStats = Object.fromEntries(
    ([
        "anticipation",
        "composure",
        "offTheBall",
        "vision",
        "firstTouch",
        "passing",
        "tackling",
        "finishing",
        "speed",
        "strength",
        "agility",
        "workrate",
        "crossing",
        "positioning",
        "technique",
        "dribbling",
        "decisions",
        "marking",
        "heading",
        "aggression",
        "flair",
        "longShots",
        "stamina",
        "teamwork",
        "determination",
        "leadership",
        "concentration",
    ] as const).map((key) => [key, 0])
) as PlayerStats;


export type StatCategory = 'technical' | 'tactical' | 'physical' | "mental";

export const StatCategoryKeys: StatCategory[] = [
    "technical",
    "tactical",
    "physical",
    "mental"
] as const;

export const StatCategoryNameMap: Record<StatCategory, string> = {
    technical: "Technical",
    tactical: "Tactical",
    physical: "Physical",
    mental: "Mental",
} as const;


export const CategorizedStats: Record<StatCategory, StatsKey[]> = {
    technical: [
        "passing",
        "firstTouch",
        "crossing",
        "dribbling",
        "technique",
        "finishing",
        "longShots",
    ],
    tactical: [
        "anticipation",
        "vision",
        "positioning",
        "offTheBall",
        "decisions",
        "marking",
        "tackling",
        "workrate",
    ],
    mental: [
        "composure",
        "concentration",
        "determination",
        "leadership",
        "teamwork",
        "aggression",
        "flair",
    ],
    physical: [
        "speed",
        "strength",
        "agility",
        "stamina",
        "heading"
    ],
} as const;