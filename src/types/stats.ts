/**
 * Player Stat Definitions
 *
 * Defines the 28 player attributes used throughout the system.
 * Stats are grouped into 4 categories: Technical, Tactical, Mental, Physical
 */

export type StatsKey =
    | "anticipation"
    | "defWorkrate"
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
    | "attWorkrate"
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
    "defWorkrate",
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
    "attWorkrate",
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
] as const;

export const statLabelMap: Record<StatsKey, string> = {
    anticipation: "Anticipation",
    defWorkrate: "Defensive Work Rate",
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
    attWorkrate: "Attacking Work Rate",
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
    defWorkrate: "DWR",
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
    attWorkrate: "AWR",
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
    defWorkrate: "bg-teal-600",
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
    attWorkrate: "bg-green-400",
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

/**
 * Player stats: 28 attributes, each 0-100
 */
export type PlayerStats = Record<StatsKey, number>;

/**
 * Default stat scores (all zeros)
 */
export const defaultStatScores: PlayerStats = Object.fromEntries(statKeys.map((key) => [key, 0])) as PlayerStats;

/**
 * Stat categories for grouping and display
 *
 * 6 play-style categories designed so different player types are visibly distinct.
 * A striker spikes Attacking, a playmaker spikes Creative, a defender spikes Defending.
 */
export type StatCategory = "attacking" | "creative" | "defending" | "physical" | "mental";

export const StatCategoryKeys: StatCategory[] = ["attacking", "creative", "defending", "physical", "mental"] as const;

export const StatCategoryNameMap: Record<StatCategory, string> = {
    attacking: "Attacking",
    creative: "Creative",
    defending: "Defending",
    physical: "Physical",
    mental: "Mental",
} as const;

export const StatCategoryShortMap: Record<StatCategory, string> = {
    attacking: "ATK",
    creative: "CRE",
    defending: "DEF",
    physical: "PHY",
    mental: "MEN",
} as const;

/**
 * Stats grouped by play-style category (28 stats, each assigned to exactly one category)
 */
export const CategorizedStats: Record<StatCategory, StatsKey[]> = {
    attacking: ["finishing", "longShots", "positioning", "offTheBall", "attWorkrate"],
    creative: ["passing", "vision", "flair", "dribbling", "crossing", "technique", "firstTouch"],
    defending: ["tackling", "marking", "defWorkrate", "aggression", "anticipation"],
    physical: ["speed", "strength", "agility", "stamina", "heading"],
    mental: ["composure", "concentration", "determination", "decisions", "leadership", "teamwork"],
} as const;
