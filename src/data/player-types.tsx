import { attributeScores, ZoneScores, PositionWeighting, Point } from "@/data/attribute-types"; // Importing from shared file

// Core Player data from Supabase
export interface Player {
    id: string;
    name: string;
    stats: attributeScores; // Stored and synced
}

export type PlayerUpdate = Partial<Player>;


// Local-only game-specific attributes
export interface GamePlayer {
    id: string; // null if a temporary guest player
    guest_name: string | null; // non null if a temporary guest player
    team: string;
    position: Point;
}

export type GamePlayerUpdate = Partial<GamePlayer>;

export interface FilledGamePlayer extends GamePlayer {
    real_name: string,
    stats: attributeScores,
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
