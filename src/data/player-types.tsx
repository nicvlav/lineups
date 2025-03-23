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

export type AttributeScores = [
    DEF: number,
    ATT: number,
    ATH: number,
    TAC: number,
    PAS: number,
    SHO: number,
    DRI: number,
    PHY: number
];

export type Point = { x: number, y: number, };

export const defaultAttributes: AttributeScores = [50, 50, 50, 50, 50, 50, 50, 50,] as AttributeScores;

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

export type Formation = {
    id: number;
    name: string;
    num_players: number;
    positions: Point[];
};