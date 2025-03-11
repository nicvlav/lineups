// types.ts
export type ZoneScores = [
    defense: number,     // 0: Defense
    attack: number,      // 1: Attack
    athleticism: number  // 2: Athleticism
];

export type Point = {
    x: number,
    y: number,
};

export type Weighting = [
    defense: ZoneScores,     // 0: Defense
    attack: ZoneScores,      // 1: Attack
    athleticism: ZoneScores  // 2: Athleticism
];

export interface Player {
    id: string;
    name: string;
    team: string | null,
    guest: boolean | null,
    temp_formation: boolean | null,
    stats: ZoneScores,
    position: Point | null,

}

export interface PlayerUpdate {
    name?: string;
    team?: string | null;
    guest?: boolean | null;
    temp_formation?: boolean | null;
    stats?: ZoneScores;
    position?: Point | null;
}

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