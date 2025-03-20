// types.ts
export const attributeLabels = [
    "Defending",
    "Attacking",
    "Athleticm",
    "Technical",
    "Tactical",
    "Creativity"
] as const;

export const attributeShortLabels = [
    "DEF",
    "ATT",
    "ATH",
    "TEC",
    "TAC",
    "CRE"
] as const;

export const attributeColors = [
    "bg-blue-600",    // DEF (Defending) - Strong, reliable blue
    "bg-red-600",     // ATT (Attacking) - Aggressive, fiery red
    "bg-emerald-500", // ATH (Athleticism) - Vibrant, energetic green
    "bg-indigo-500",  // TEC (Technical) - Creative, skillful purple-blue
    "bg-orange-500",  // TAC (Tactical) - Strategic, calculated orange
    "bg-pink-500"     // CRE (Creativity) - Imaginative, playful pink
] as const;

export const zoneScoreLabels = [
    "Defending",
    "Midfield",
    "Attack",
] as const;

export const zoneScoreShortLabels = [
    "DEF",
    "MID",
    "ATT"
] as const;

export type AttributeScores = [number, number, number, number, number, number];
export type ZoneScores = [number, number, number];
export type Point = { x: number, y: number, };

export type Weighting = [
    defense: AttributeScores,     // 0: Defense
    attack: AttributeScores,      // 1: Attack
    athleticism: AttributeScores  // 2: Athleticism
];

export const defaultAttributes: AttributeScores = [50, 50, 50, 50, 50, 50,] as AttributeScores;
export const defaultZoneWeights: Weighting = [
    //"DEF", "ATT", "ATH", "TEC", "TAC", "CRE"
    [100, 0, 20, 20, 70, 0], // defense attribute weights
    [30, 80, 60, 60, 90, 90], // midfield attribute weights
    [0, 100, 70, 100, 20, 40]// attack attribute weights
] as Weighting;

export interface Player {
    id: string;
    name: string;
    team: string | null,
    guest: boolean | null,
    temp_formation: boolean | null,
    stats: AttributeScores,
    position: Point | null,
}

export type PlayerUpdate = Partial<Player>;

export interface DnDPlayerItem {
    id: string;
    name: string;
    team: string;
}
export interface ScoredPlayer extends Player {
    zoneFit: ZoneScores;
}

export type Formation = {
    id: number;
    name: string;
    num_players: number;
    positions: Point[];
};