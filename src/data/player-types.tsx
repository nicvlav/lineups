import { attributeScores, ZoneScores, Weighting, emptyZoneScores, PositionWeighting, Point } from "@/data/attribute-types"; // Importing from shared file

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

const getXForPlayerPosition = (position: PositionWeighting, positionIndex: number, numPositionentries: number) => {
    if (!position.isCentral) {
        if (positionIndex >= 2) throw new Error(`More than 2 players in ${position.positionName} position?`);
        return positionIndex;
    }

    let startShift = 0.0;
    let spacing = 0.4 / (numPositionentries); // Max width for players

    if (numPositionentries % 2) {
        if (positionIndex === 0) return 0.5;
        startShift = spacing;
        positionIndex--;
    } else {
        startShift = -spacing / 2;
    }

    if (positionIndex % 2 === 0) {
        return 0.5 - startShift - (spacing * (1 + Math.floor(positionIndex / 2)));
    } else {
        return 0.5 + startShift + (spacing * (1 + Math.floor(positionIndex / 2)));
    }
};

export const getYRangeForTeamZone = (zoneIndex: number) => {
    const numZones = emptyTeamZones.length;
    const zoneYShift = 0.1;
    const zoneYScaling = 0.8;

    return {
        yEnd: zoneIndex ? (1.0 - zoneYShift - zoneIndex * zoneYScaling / numZones) : 1.0,
        yStart: zoneIndex ? (1.0 - zoneYShift - (zoneIndex + 1) * zoneYScaling / numZones) : 1.0
    }
};

export const getPointForPosition = (position: PositionWeighting, yEnd: number, yStart: number, positionIndex: number, numPositionentries: number) => {
    return {
        x: getXForPlayerPosition(position, positionIndex, numPositionentries),
        y: position.relativeYPosition * (yEnd - yStart) + yStart
    } as Point;
};

export const calculateScores = (players: FilledGamePlayer[], zoneWeights: Weighting): ScoredGamePlayer[] => {
    return players.map(player => {

        const zoneFit: ZoneScores = structuredClone(emptyZoneScores);

        zoneWeights.forEach((zoneArray, zone) => {
            zoneArray.forEach((positionObject, position) => {
                // dot product
                const score = player.stats.reduce((sum, statValue, index) => {
                    return sum + statValue * positionObject.weighting[index];
                }, 0);

                zoneFit[zone][position] = score;
            });
        });

        return { ...player, zoneFit };
    });
};

export const assignPositions = (zones: TeamZones, team: string) => {
    let finalPlayers: ScoredGamePlayer[] = [];

    zones.forEach((zone, index) => {
        const { yEnd, yStart } = getYRangeForTeamZone(index);

        zone.forEach((players) => {
            players.forEach((player, pidx) => {
                finalPlayers.push({
                    ...player,
                    team,
                    position: getPointForPosition(player.generatedPositionInfo,
                        yEnd, yStart, pidx,
                        players.length)
                } as ScoredGamePlayer);
            });
        });
    });

    return finalPlayers;
}
